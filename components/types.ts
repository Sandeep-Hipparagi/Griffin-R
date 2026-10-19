export interface ApplicationFormState {
  project_name: string | null;
  personal_ownership: string | null;
  impact_metrics: string | null;
  ready_for_review: boolean;
}

export type ConnectionStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";
