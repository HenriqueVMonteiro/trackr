import type { EventBus, Unsubscribe, DomainEvent } from "@/shared";
import type { SendNotification } from "../../application/use-cases/SendNotification";
import type { NotificationRepository } from "../../application/ports/NotificationRepository";

// Shape do payload do evento issue.assigned (contrato público do módulo issues).
interface IssueAssignedPayload {
  issueId: string;
  projectId: string;
  assigneeId: string | null;
  previousAssigneeId: string | null;
  actorId: string;
}

export interface IssueAssignedSubscriberDeps {
  sendNotification: SendNotification;
  repo: NotificationRepository;
}

// GoF: Observer — quando issue.assigned é publicado, dispara uma notificação para
// o assignee em cada canal habilitado nas preferências dele.
export function registerIssueAssignedSubscriber(
  events: EventBus,
  deps: IssueAssignedSubscriberDeps,
): Unsubscribe {
  return events.subscribe<DomainEvent<IssueAssignedPayload>>(
    "issue.assigned",
    async (event) => {
      const { assigneeId, issueId } = event.payload;
      if (!assigneeId) return;
      const channels = await deps.repo.getPreferences(assigneeId, "issue.assigned");
      for (const channel of channels) {
        await deps.sendNotification.execute({
          recipientId: assigneeId,
          to: assigneeId,
          channel,
          subject: "Você foi designado para uma issue",
          body: `A issue ${issueId} foi atribuída a você.`,
        });
      }
    },
  );
}
