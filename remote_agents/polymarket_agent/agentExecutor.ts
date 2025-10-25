import { v4 as uuidv4 } from "uuid";
import type {
  Message,
  Task,
  TaskArtifactUpdateEvent,
  TaskStatusUpdateEvent,
} from "@a2a-js/sdk";
import type { AgentExecutor, ExecutionEventBus } from "@a2a-js/sdk/server";
import { RequestContext } from "@a2a-js/sdk/server";

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

// Helper to create a new agent message
function newAgentMessage(parts: { kind: "text"; text: string }[]): Message {
  return {
    kind: "message",
    messageId: uuidv4(),
    role: "agent",
    parts,
  };
}

// Simple API fetcher - no AI needed
async function fetchPolymarketData(): Promise<string> {
  try {
    const response = await fetch("https://gamma-api.polymarket.com/series");
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    const data = await response.json();

    // Return a summary instead of full data to avoid overwhelming responses
    const summary = {
      total_markets: Array.isArray(data) ? data.length : 0,
      markets: Array.isArray(data)
        ? data.slice(0, 20).map((market: any) => ({
            title: market.title || "Unknown",
            ticker: market.ticker || "N/A",
            slug: market.slug || "N/A",
            end_date: market.end_date || "N/A",
            tags: market.tags || [],
            volume: market.volume || 0,
            liquidity: market.liquidity || 0,
          }))
        : [],
      note:
        "Showing first 20 markets. Total available: " +
        (Array.isArray(data) ? data.length : 0),
    };

    return JSON.stringify(summary, null, 2);
  } catch (error) {
    console.error("Error fetching Polymarket data:", error);
    throw error;
  }
}

class PolymarketAgentExecutor implements AgentExecutor {
  constructor() {
    // No agent needed - direct API calls only
  }

  async execute(
    context: RequestContext,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    if (!context.taskId || !context.contextId) {
      throw new Error("RequestContext must have taskId and contextId");
    }

    if (!context) {
      throw new Error("No context request found");
    }

    // Extract user message text from the first text part
    const userMessage = context.userMessage;
    const textPart = userMessage.parts.find((part) => part.kind === "text");
    const query = textPart && "text" in textPart ? textPart.text : "";

    // If no current task, publish initial submitted task
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

    // Start working: Publish initial working status
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
      logging.info(`Fetching Polymarket data for query: ${query}`);

      // Direct API call - no AI processing needed
      const data = await fetchPolymarketData();

      logging.info(
        `Successfully fetched data, length: ${data.length} characters`
      );

      // Publish the result message FIRST
      const resultMessage: Message = newAgentMessage([
        { kind: "text", text: data },
      ]);
      resultMessage.contextId = context.contextId;
      (resultMessage as any).taskId = context.taskId;
      eventBus.publish(resultMessage);

      logging.info(`Published result message`);

      // Then publish completed status
      const completedUpdate: TaskStatusUpdateEvent = {
        kind: "status-update",
        taskId: context.taskId,
        contextId: context.contextId,
        status: {
          state: "completed" as TaskState,
          timestamp: new Date().toISOString(),
        },
        final: true,
      };
      eventBus.publish(completedUpdate);

      logging.info(`Published completed status`);

      eventBus.finished();
      logging.info(`Finished execution`);
    } catch (e) {
      logger.error(`An error occurred while fetching Polymarket data: ${e}`);
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
      throw new Error("Internal Server Error");
    }
  }

  async cancelTask(taskId: string, eventBus: ExecutionEventBus): Promise<void> {
    // Implement cancellation logic if needed; for now, raise unsupported
    throw new Error("Internal Server Error");
  }
}

export { PolymarketAgentExecutor };
