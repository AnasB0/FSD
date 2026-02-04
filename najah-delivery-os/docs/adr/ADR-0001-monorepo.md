# ADR-0001: Monorepo Structure

**Status**: Accepted  
**Date**: 2024-01-15  
**Decision Makers**: Engineering Team  
**Technical Story**: Organize Najah Delivery OS codebase

## Context

Najah Delivery OS consists of 10 microservices (7 backend, 3 frontend), shared infrastructure code, and documentation. We need to decide how to organize the codebase:

**Option 1: Polyrepo** - Separate repository for each service  
**Option 2: Monorepo** - Single repository with all services in subdirectories  
**Option 3: Hybrid** - Core services in monorepo, optional services in separate repos

## Decision

We will use a **monorepo structure** with all services, infrastructure, and documentation in a single repository.

## Rationale

### Benefits of Monorepo

1. **Atomic Commits Across Service Boundaries**
   - A single commit can update Express API and Auth service together
   - No need to coordinate multiple PRs across repositories
   - Easier to maintain consistency during refactoring

2. **Simplified Dependency Management**
   - Shared dependencies (e.g., Winston logger config) in one place
   - Single `package-lock.json` or per-service lockfiles, your choice
   - Easier to upgrade dependencies across all services

3. **Single Source of Truth for Infrastructure**
   - Docker Compose, Terraform, and CI/CD in one place
   - No "which repo has the latest docker-compose.yml?" confusion
   - Infrastructure as Code version-controlled with application code

4. **Unified Documentation**
   - Architecture docs, ADRs, runbooks all in `/docs`
   - Easier to keep documentation in sync with code
   - Single README for entire system

5. **Simplified CI/CD**
   - One GitHub Actions workflow for entire system
   - Can trigger dependent service builds in one pipeline
   - Easier to run integration tests across services

6. **Team Collaboration**
   - Developers can see and understand the entire system
   - Easier code reviews (can review changes across services)
   - No permission issues accessing separate repos

7. **Faster Onboarding**
   - New developers clone one repo and see everything
   - Clear structure: `/services`, `/infra`, `/docs`, `/scripts`
   - Single `.env.example` with all configuration

8. **Consistent Tooling**
   - Same ESLint, Prettier, and Jest config across services
   - Shared scripts in `/scripts` directory
   - Standardized logging, error handling patterns

### Trade-offs

**Drawbacks We Accept:**

1. **Larger Repository Size**
   - Mitigation: Git sparse-checkout if needed
   - Reality: 10 services + docs is still < 100MB

2. **Longer CI/CD Builds**
   - Mitigation: Build only changed services (GitHub Actions path filters)
   - Reality: Full build in 5-7 minutes is acceptable

3. **Potential for Tighter Coupling**
   - Mitigation: Enforce service boundaries through code review
   - Reality: Services still communicate via HTTP APIs only

4. **Access Control Complexity**
   - Mitigation: Not needed for our team size (< 10 developers)
   - Reality: If needed later, use GitHub branch protection

## Repository Structure

```
najah-delivery-os/
├── .github/
│   └── workflows/          # CI/CD pipelines
├── docs/                   # Documentation
│   ├── adr/               # Architecture Decision Records
│   ├── architecture.md
│   ├── data-models.md
│   └── ...
├── infra/                  # Infrastructure as Code
│   ├── terraform/         # AWS deployment
│   └── docker-compose.yml # Local development
├── scripts/               # Shared scripts
│   ├── start-local.sh
│   ├── stop-local.sh
│   └── health-check.sh
├── services/              # All microservices
│   ├── express-api/
│   ├── auth/
│   ├── payments/
│   ├── ingestion/
│   ├── optimizer/
│   ├── geocoding/
│   ├── llm-assistant/
│   ├── merchant-portal/
│   ├── driver-app/
│   └── streamlit-admin/
├── .env.example           # Environment variables template
├── .gitignore            # Shared ignore rules
└── README.md             # Main documentation
```

## Comparison with Alternatives

### Polyrepo Approach

**Pros:**
- Independent versioning per service
- Smaller repository size
- Fine-grained access control

**Cons:**
- 10+ repositories to manage
- Coordination overhead for cross-service changes
- Infrastructure code duplication
- Documentation fragmentation
- Complex CI/CD orchestration
- Harder for developers to understand full system

**Verdict:** Too much overhead for our team size and system complexity.

### Hybrid Approach

**Pros:**
- Core services in monorepo for easy coordination
- Optional/experimental services isolated
- Can open-source specific services separately

**Cons:**
- Ambiguity: which services go in monorepo vs. separate?
- Still have coordination issues for split services
- Complexity without clear benefit

**Verdict:** Adds complexity without solving real problems.

## Implementation

1. **Service Isolation**
   - Each service has its own `package.json` or `requirements.txt`
   - Services don't import code from each other (HTTP APIs only)
   - Clear README in each service directory

2. **Shared Code**
   - If needed, create `/shared` directory with reusable modules
   - Prefer duplicating small utilities over premature abstraction
   - Document shared code dependencies clearly

3. **CI/CD Strategy**
   - GitHub Actions with path filters to build only changed services
   - Example: Changes to `/services/express-api/**` trigger Express API build
   - Full integration tests run on changes to `/infra/**` or `/services/**`

4. **Build Optimization**
   - Docker layer caching for faster rebuilds
   - Multi-stage Dockerfiles to minimize image size
   - Use `docker compose` for local development consistency

## Examples of Successful Monorepos

- **Google**: 2+ billion lines of code in single repo
- **Facebook**: Entire codebase in single repo
- **Uber**: Go monorepo for microservices
- **Airbnb**: JavaScript monorepo
- **Twitter**: Scala monorepo

Tools like Nx, Turborepo, and Bazel make monorepos scale to thousands of services.

## Alternatives Considered

### Lerna/Nx for Monorepo Management

Not needed yet because:
- Only 10 services (manageable complexity)
- Simple build dependencies
- No shared libraries (services are independent)

Can revisit if we grow to 50+ services.

### Git Submodules

Rejected because:
- Complex to manage (nested git operations)
- Easy to get into inconsistent state
- Poor developer experience
- Doesn't solve coordination problem

## Consequences

### Positive

- ✅ Faster feature development (no cross-repo coordination)
- ✅ Easier refactoring (can update multiple services together)
- ✅ Better code review (see full context of changes)
- ✅ Simpler CI/CD (single pipeline)
- ✅ Single source of truth for documentation

### Negative

- ❌ Larger git clone size (mitigated by fast internet)
- ❌ Longer CI/CD builds (mitigated by path filters)
- ❌ Need discipline to maintain service boundaries

### Neutral

- Developer experience improves (easier to navigate codebase)
- DevOps complexity stays same (one set of infrastructure)

## Risks and Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Tight coupling between services | Medium | High | Code review enforcement, API contracts |
| Slow CI/CD builds | Low | Medium | Path filters, caching, parallel builds |
| Large repo size | Low | Low | Git sparse-checkout if needed |
| Access control issues | Low | Low | Branch protection, CODEOWNERS file |

## Success Criteria

This decision is successful if:
- ✅ Developers can clone and run entire system in < 5 minutes
- ✅ Cross-service changes require single PR, not multiple
- ✅ CI/CD pipeline completes in < 10 minutes
- ✅ New developer onboarding takes < 1 hour
- ✅ Documentation stays in sync with code

## Revisions

- **2024-01-15**: Initial decision (v1.0)

## References

- [Monorepo vs Polyrepo](https://medium.com/@mattklein123/monorepos-please-dont-7c8b6b45c9a7)
- [Why Google Stores Billions of Lines of Code in a Single Repository](https://research.google/pubs/pub45424/)
- [Monorepo Tools](https://monorepo.tools/)

## Related ADRs

- [ADR-0002: Database Choice](ADR-0002-database-choice.md)
- [ADR-0003: Routing Engine](ADR-0003-routing-engine.md)
