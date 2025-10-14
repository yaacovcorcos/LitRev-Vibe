import { composeJobQueuePayloadSchema } from "./jobs";

export type ComposeJobResult = {
  completedSections: number;
  totalSections: number;
};

export async function processComposeJob(data: unknown): Promise<ComposeJobResult> {
  composeJobQueuePayloadSchema.parse(data);

  throw new Error("Compose job processor not implemented yet");
}
