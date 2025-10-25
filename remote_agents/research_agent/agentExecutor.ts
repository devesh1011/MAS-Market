import { v4 as uuidv4 } from "uuid";
import type {
  Message,
  Task,
  TaskArtifactUpdateEvent,
  TaskStatusUpdateEvent,
} from "@a2a-js/sdk";
import type { AgentExecutor, ExecutionEventBus } from "@a2a-js/sdk/server";
import { RequestContext } from "@a2a-js/sdk/server";
import { MarketResearchAgent } from "./agent.js";

const logging = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
};

const logger = {
  error: (msg: string) => logging.error(msg),
};

// TaskState as defined in @a2a-js/sdk
type TaskState =
  | "submitted"
  | "working"
  | "input-required"
  | "completed"
  | "failed"
  | "canceled"
  | "rejected"
  | "auth-required"
  | "unknown";

class ResearchAgentExecutor implements AgentExecutor {
  agent: MarketResearchAgent;

  constructor() {
    this.agent = new MarketResearchAgent();
  }

  async execute(
    context: RequestContext,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    if (!context.taskId || !context.contextId) {
      throw new Error("RequestContext must have taskId and contextId");
    }

    // Extract user message text from the first text part
    const userMessage = context.userMessage;
    const textPart = userMessage.parts.find((part) => part.kind === "text");
    const query = textPart && "text" in textPart ? textPart.text : "";

    if (!query) {
      throw new Error("No query text found in user message");
    }

    // 1. Publish initial 'submitted' task (if not already created)
    if (!context.task) {
      const initialTask: Task = {
        kind: "task",
        id: context.taskId,
        contextId: context.contextId,
        status: {
          state: "submitted" as TaskState,
          timestamp: new Date().toISOString(),
        },
      };
      eventBus.publish(initialTask);
    }

    // 2. Publish 'working' status
    const workingUpdate: TaskStatusUpdateEvent = {
      kind: "status-update",
      taskId: context.taskId,
      contextId: context.contextId,
      status: {
        state: "working" as TaskState,
        timestamp: new Date().toISOString(),
      },
      final: false,
    };
    eventBus.publish(workingUpdate);

    try {
      // 3. Invoke the research agent and await the structured result
      logging.info(`Starting research for query: "${query}"`);
      const result = await this.agent.invoke({
        messages: [{ role: "user", content: query }],
      });

      // 4. The agent returns clean structured data with summary and what_to_bet
      let jsonResponse: { summary: string; what_to_bet: string } = {
        summary: "Unable to generate summary",
        what_to_bet: "insufficient_data",
      };

      // Extract structured response - toolStrategy ensures structuredResponse is always populated
      if (
        result &&
        typeof result === "object" &&
        "summary" in result &&
        "what_to_bet" in result
      ) {
        jsonResponse = {
          summary: String(result.summary).trim(),
          what_to_bet: String(result.what_to_bet).trim(),
        };
        logging.info(`Research result: ${jsonResponse.what_to_bet}`);
      }

      // 5. Publish the clean JSON response
      const resultMessage: Message = {
        kind: "message",
        messageId: uuidv4(),
        role: "agent",
        parts: [
          {
            kind: "text" as const,
            text: JSON.stringify(jsonResponse),
          },
        ],
      };
      resultMessage.contextId = context.contextId;
      (resultMessage as any).taskId = context.taskId;
      eventBus.publish(resultMessage);

      // 6. Publish 'completed' status
      const completeUpdate: TaskStatusUpdateEvent = {
        kind: "status-update",
        taskId: context.taskId,
        contextId: context.contextId,
        status: {
          state: "completed" as TaskState,
          timestamp: new Date().toISOString(),
        },
        final: true,
      };
      eventBus.publish(completeUpdate);
      eventBus.finished();

      logging.info(`Research completed for task ${context.taskId}`);
    } catch (e) {
      logger.error(`An error occurred during research: ${e}`);

      const errorUpdate: TaskStatusUpdateEvent = {
        kind: "status-update",
        taskId: context.taskId,
        contextId: context.contextId,
        status: {
          state: "failed" as TaskState,
          timestamp: new Date().toISOString(),
        },
        final: true,
      };
      eventBus.publish(errorUpdate);
      eventBus.finished();

      throw new Error(`Research failed: ${e}`);
    }
  }

  async cancelTask(taskId: string, eventBus: ExecutionEventBus): Promise<void> {
    // Research agent doesn't support cancellation
    // You could implement cancellation logic here if needed
    logging.info(
      `Cancellation requested for task ${taskId}, but not implemented`
    );
  }
}

export { ResearchAgentExecutor };
