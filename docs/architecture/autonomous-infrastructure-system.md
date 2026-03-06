# iCareOS Autonomous AI Infrastructure System
# Elite Context Engineering Prompt

**Platform:** iCareOS by ChanceTEK
**Type:** AI-Native Clinical Operating System
**Production Domain:** Healthcare AI Infrastructure
**Integration Target:** iCareOS.tech

---

## The Master System Directives

This document outlines the elite context engineering specs defining the iCareOS platform, composed of intelligent healthcare modules powered by an Autonomous AI Infrastructure System of five specialized agentic AI agents.

The platform must operate at enterprise healthcare production standards, ensuring:
- reliability
- security
- HIPAA-aware compliance
- continuous system monitoring
- autonomous error correction

### Multi-Agent System Architecture
The system relies on five continuously running, persistent background agents:
1. **Platform Validation Agent (PVA)**
2. **Code Security Agent (CSA)**
3. **DevOps Guardian Agent (DGA)**
4. **AI Infrastructure Performance Agent (IPA)**
5. **AI Compliance & HIPAA Monitoring Agent (CMA)**

### Agent Communication Layer: Agent2Agent (A2A) Protocol
All agents communicate via the A2A system to support:
- agent messaging
- event broadcasting
- task delegation
- alert notifications
- repair coordination (e.g., Security Agent detects vulnerability → communicates with DevOps Agent → patch deployed automatically)

### MCP Integration (Model Context Protocol)
Agents access system resources via structured MCP servers, interacting with:
- internal APIs
- platform databases
- monitoring tools
- environment configuration
- system telemetry
- audit logs

### Tavily Intelligence Integration
Agents integrate Tavily search intelligence for real-time querying of security advisories, vulnerability databases, best-practice solutions, and documentation references to stay aligned with global intelligence.

---

## Agent Responsibilities

### 1️⃣ Platform Validation Agent
- **Monitor:** Runtime health, API response, DB connectivity, frontend rendering, service availability across all modules (MediScribe, Insight, WoundIQ, RadiologyIQ, iSkylar, BillingIQ, RiskIQ, CareCoordIQ).
- **Detect:** Broken modules, failing services, slow queries, dependency conflicts.
- **Auto-Repair:** Restart services, reinstall dependencies, rebuild modules.

### 2️⃣ Code Security Agent
- **Monitor:** SQL injection, XSS, CSRF, exposed API keys, insecure auth flows, vulnerable dependencies.
- **Auto-Repair:** Refactor insecure code, sanitize inputs, rotate exposed secrets, enforce encryption.

### 3️⃣ DevOps Guardian Agent
- **Monitor:** CI/CD workflows, build/deploy pipelines, container health, env vars.
- **Auto-Repair:** Restart failed builds, fix env misconfigs, redeploy failed services.

### 4️⃣ AI Infrastructure Performance Agent
- **Monitor:** CPU/memory usage, API latency, agent execution times.
- **Auto-Repair:** Optimize queries, scale resources, refactor slow ops, restart memory leaks.

### 5️⃣ AI Compliance & HIPAA Monitoring Agent
- **Monitor:** PHI handling, unauthorized access, secure storage, audit trail integrity.
- **Auto-Repair:** Secure data storage, enforce encryption, restrict access, alert admins.

---

## Cross-Agent Monitoring & Governance

- **Cross-Checking:** CSA monitors for insecure actions. PVA monitors for agent failures. CMA monitors for PHI violations.
- **Centralized Audit Log System:** Located at `/system/audit_logs`, tracking user activity, system events, automated repairs, security patches. Log entries include timestamp, responsible agent, severity, affected module, and action taken.
- **Admin Governance Dashboard:** Accessible via `Chancellor@ichancetek.com`. Provides system health, audit logs, security/compliance alerts, and user/RBAC management tools.
- **System Telemetry & Analytics:** Bar/Pie charts for system/module usage, agent repairs, security events. Automated report generation to `/system_reports/`.

---

## Production Standards
- **System Stability:** ≥ 99%
- **Security Score:** ≥ 95
- **Performance Score:** ≥ 95
- **Compliance Score:** ≥ 95
- **Build Success Rate:** ≥ 98%
- **Critical Security Vulnerabilities:** 0
- **Pipeline Failure Recovery:** ≤ 5 minutes

*When implemented fully, iCareOS becomes a self-healing, self-securing, autonomous clinical operating system where external intelligence is gathered via Tavily, repairs and patches occur automatically, and administrators maintain total governance visibility.*
