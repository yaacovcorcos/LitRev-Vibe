import type { Meta, StoryObj } from "@storybook/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LocatorSummary } from "@/app/project/[id]/ledger/page";

const meta: Meta = {
  title: "Ledger/LocatorSummary",
  component: LocatorSummary,
};

export default meta;

type Story = StoryObj<typeof LocatorSummary>;

const sampleLocator = {
  text: "Participants receiving the intervention showed a 25% reduction in systolic blood pressure compared to control.",
  page: 5,
  paragraph: 3,
  source: "PDF",
};

export const Default: Story = {
  render: () => (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Locator Summary</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent>
        <LocatorSummary locator={sampleLocator} />
      </CardContent>
    </Card>
  ),
};

const minimalLocator = {
  text: "Primary outcome did not differ between groups.",
};

export const Minimal: Story = {
  render: () => (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Locator Summary (Minimal)</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent>
        <LocatorSummary locator={minimalLocator} />
      </CardContent>
    </Card>
  ),
};
