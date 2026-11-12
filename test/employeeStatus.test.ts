import { describe, expect, it } from "vitest";
import { activeEmployeeSql, isEmployeeActive } from "../src/utils/employeeStatus";
import type { AppConfig } from "../src/config/env";

function cfg(partial: Partial<AppConfig>): Pick<AppConfig, "ACTIVE_EMPLOYEE_STATUSES" | "INACTIVE_EMPLOYEE_STATUSES"> {
  return {
    ACTIVE_EMPLOYEE_STATUSES: partial.ACTIVE_EMPLOYEE_STATUSES ?? [],
    INACTIVE_EMPLOYEE_STATUSES: partial.INACTIVE_EMPLOYEE_STATUSES ?? ["DISABLED", "INACTIVE"],
  };
}

describe("employeeStatus", () => {
  it("defaults to allowlist wins: active list restricts", () => {
    const c = cfg({ ACTIVE_EMPLOYEE_STATUSES: ["ACTIVE", "PROBATION"] });
    expect(isEmployeeActive("ACTIVE", c)).toBe(true);
    expect(isEmployeeActive("INACTIVE", c)).toBe(false);
  });

  it("blocklist excludes configured inactive statuses", () => {
    const c = cfg({ ACTIVE_EMPLOYEE_STATUSES: [], INACTIVE_EMPLOYEE_STATUSES: ["INACTIVE", "TERMINATED"] });
    expect(isEmployeeActive("ACTIVE", c)).toBe(true);
    expect(isEmployeeActive("INACTIVE", c)).toBe(false);
    expect(isEmployeeActive("TERMINATED", c)).toBe(false);
  });

  it("activeEmployeeSql uses correct placeholder start index", () => {
    const c = cfg({ INACTIVE_EMPLOYEE_STATUSES: ["INACTIVE"] });
    const q = activeEmployeeSql(c, "ep", 2);
    expect(q.clause).toContain("$2");
    expect(q.params).toEqual(["INACTIVE"]);
    expect(q.nextParam).toBe(3);
  });

  it("treats DISABLED as inactive by default, case-insensitively", () => {
    const c = cfg({});
    expect(isEmployeeActive("DISABLED", c)).toBe(false);
    expect(isEmployeeActive("Disabled", c)).toBe(false);
    expect(isEmployeeActive("disabled", c)).toBe(false);
    expect(isEmployeeActive("inactive", c)).toBe(false);
  });

  it("keeps ACTIVE and null statuses active by default", () => {
    const c = cfg({});
    expect(isEmployeeActive("ACTIVE", c)).toBe(true);
    expect(isEmployeeActive(null, c)).toBe(true);
    expect(isEmployeeActive(undefined, c)).toBe(true);
  });

  it("activeEmployeeSql compares upper-cased status against upper-cased params", () => {
    const q = activeEmployeeSql(cfg({ INACTIVE_EMPLOYEE_STATUSES: ["disabled", "Inactive"] }), "ep", 1);
    expect(q.clause).toBe("(UPPER(ep.employee_status) IS NULL OR UPPER(ep.employee_status) NOT IN ($1, $2))");
    expect(q.params).toEqual(["DISABLED", "INACTIVE"]);
    expect(q.nextParam).toBe(3);
  });

  it("allowlist is case-insensitive too", () => {
    const c = cfg({ ACTIVE_EMPLOYEE_STATUSES: ["active"] });
    expect(isEmployeeActive("ACTIVE", c)).toBe(true);
    expect(activeEmployeeSql(c, "ep", 1).params).toEqual(["ACTIVE"]);
  });
});
