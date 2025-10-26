import { v4 as uuidv4 } from "uuid";
import type {
  Message,
  Task,
  TaskStatusUpdateEvent,
} from "@a2a-js/sdk";
import type { AgentExecutor, ExecutionEventBus } from "@a2a-js/sdk/server";
import { RequestContext } from "@a2a-js/sdk/server";
import { BettorAgent } from "./agent.js";

const logging = {
  info: (msg: string) => console.log(`[BETTOR-INFO] ${msg}`),
  error: (msg: string) => console.error(`[BETTOR-ERROR] ${msg}`),
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

class BettorAgentExecutor implements AgentExecutor {
  agent: BettorAgent;

  constructor() {
    this.agent = new BettorAgent();
  }

  async execute(
    context: RequestContext,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    if (!context.taskId || !context.contextId) {
      throw new Error("RequestContext must have taskId and contextId");
    }

    // Extract user message text
    const userMessage = context.userMessage;
    const textPart = userMessage.parts.find((part) => part.kind === "text");
    const query = textPart && "text" in textPart ? textPart.text : "";

    if (!query) {
      throw new Error("No query text found in user message");
    }

    // 1. Publish initial 'submitted' task
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
      // 3. Invoke bettor agent
      logging.info(`Processing bet request: "${query}"`);
      const result = await this.agent.invoke({
        messages: [{ role: "user", content: query }],
      });

      logging.info(`Bet processing complete`);

      // 4. Publish result message
      const resultMessage: Message = {
        kind: "message",
        messageId: uuidv4(),
        role: "agent",
        parts: [
          {
            kind: "text" as const,
            text: typeof result === "string" ? result : JSON.stringify(result),
          },
        ],
      };
      resultMessage.contextId = context.contextId;
      (resultMessage as any).taskId = context.taskId;
      eventBus.publish(resultMessage);

      // 5. Publish 'completed' status
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

      logging.info(`Task ${context.taskId} completed`);
    } catch (e) {
      logging.error(`Bet processing failed: ${e}`);

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

      throw new Error(`Bet processing failed: ${e}`);
    }
  }

  async cancelTask(taskId: string, eventBus: ExecutionEventBus): Promise<void> {
    logging.info(
      `Cancellation requested for task ${taskId}, but not implemented`
    );
  }
}

export { BettorAgentExecutor };

