import { v4 as uuidv4 } from "uuid";
import type {
  Message,
  Task,
  TaskArtifactUpdateEvent,
  TaskStatusUpdateEvent,
} from "@a2a-js/sdk";
import type { AgentExecutor, ExecutionEventBus } from "@a2a-js/sdk/server";
import { RequestContext } from "@a2a-js/sdk/server";
import { PolymarketAgent } from "./agent.ts";

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

// Helper to create a new agent message (similar to Python's updater.new_agent_message)
function newAgentMessage(parts: { kind: "text"; text: string }[]): Message {
  return {
    kind: "message",
    messageId: uuidv4(),
    role: "agent",
    parts,
    // contextId would be set when publishing
  };
}

class PolymarketAgentExecutor implements AgentExecutor {
  private agent: PolymarketAgent;

  constructor() {
    this.agent = new PolymarketAgent();
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
      for await (const item of this.agent.stream(query, context.contextId)) {
        const isTaskComplete = item.is_task_complete;
        const requireUserInput = item.require_user_input;
        const parts = [{ kind: "text" as const, text: item.content }];

        if (!isTaskComplete && !requireUserInput) {
          // Working state with message
          const workingMessageUpdate: TaskStatusUpdateEvent = {
            kind: "status-update",
            taskId: context.taskId,
            contextId: context.contextId,
            status: {
              state: "working" as TaskState,
              timestamp: new Date().toISOString(),
            },
            final: false,
          };
          eventBus.publish(workingMessageUpdate);
          // Optionally publish a message event if needed, but status-update suffices
        } else if (requireUserInput) {
          // Input required
          const inputRequiredUpdate: TaskStatusUpdateEvent = {
            kind: "status-update",
            taskId: context.taskId,
            contextId: context.contextId,
            status: {
              state: "input_required" as TaskState,
              timestamp: new Date().toISOString(),
            },
            final: false,
          };
          eventBus.publish(inputRequiredUpdate);
          // Publish message with parts
          const agentMessage: Message = newAgentMessage(parts);
          agentMessage.contextId = context.contextId;
          eventBus.publish(agentMessage);
          break;
        } else {
          // Completed: Add artifact and complete
          const artifactUpdate: TaskArtifactUpdateEvent = {
            kind: "artifact-update",
            taskId: context.taskId,
            contextId: context.contextId,
            artifact: {
              artifactId: "scheduling_result",
              name: "scheduling_result",
              parts,
            },
          };
          eventBus.publish(artifactUpdate);

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
          break;
        }
      }
    } catch (e) {
      logger.error(`An error occurred while streaming the response: ${e}`);
      const errorUpdate: TaskStatusUpdateEvent = {
        kind: "status-update",
        taskId: context.taskId,
        contextId: context.contextId,
        status: {
          state: "error" as TaskState,
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
