import type { Database } from "@/infrastructure/db/client";
import { DrizzleReportReader } from "./infrastructure/DrizzleReportReader";
import {
  GetProjectThroughput,
  GetProjectCycleTime,
  GetProjectStatusDistribution,
  type ReportReader,
} from "./application";

export type * from "./domain";
export type {
  ReportReader,
  GetProjectThroughputInput,
  GetProjectCycleTimeInput,
  GetProjectStatusDistributionInput,
} from "./application";

export interface ReportsModuleDeps {
  db: Database;
}

export interface ReportsModule {
  getProjectThroughput: GetProjectThroughput;
  getProjectCycleTime: GetProjectCycleTime;
  getProjectStatusDistribution: GetProjectStatusDistribution;
  reader: ReportReader;
}

export function createReportsModule(deps: ReportsModuleDeps): ReportsModule {
  const reader = new DrizzleReportReader(deps.db);
  return {
    getProjectThroughput: new GetProjectThroughput(reader),
    getProjectCycleTime: new GetProjectCycleTime(reader),
    getProjectStatusDistribution: new GetProjectStatusDistribution(reader),
    reader,
  };
}
