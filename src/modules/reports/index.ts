import type { Database } from "@/infrastructure/db/client";
import { DrizzleReportReader } from "./infrastructure/DrizzleReportReader";
import {
  GetProjectThroughput,
  GetProjectCycleTime,
  GetProjectStatusDistribution,
  GetSprintVelocity,
  GetSprintBurndown,
  type ReportReader,
} from "./application";

export type * from "./domain";
export type {
  ReportReader,
  GetProjectThroughputInput,
  GetProjectCycleTimeInput,
  GetProjectStatusDistributionInput,
  GetSprintVelocityInput,
  GetSprintBurndownInput,
} from "./application";

export interface ReportsModuleDeps {
  db: Database;
}

export interface ReportsModule {
  getProjectThroughput: GetProjectThroughput;
  getProjectCycleTime: GetProjectCycleTime;
  getProjectStatusDistribution: GetProjectStatusDistribution;
  getSprintVelocity: GetSprintVelocity;
  getSprintBurndown: GetSprintBurndown;
  reader: ReportReader;
}

export function createReportsModule(deps: ReportsModuleDeps): ReportsModule {
  const reader = new DrizzleReportReader(deps.db);
  return {
    getProjectThroughput: new GetProjectThroughput(reader),
    getProjectCycleTime: new GetProjectCycleTime(reader),
    getProjectStatusDistribution: new GetProjectStatusDistribution(reader),
    getSprintVelocity: new GetSprintVelocity(reader),
    getSprintBurndown: new GetSprintBurndown(reader),
    reader,
  };
}
