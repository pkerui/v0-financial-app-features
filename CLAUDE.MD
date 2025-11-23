# Claude Code Configuration

## 🔴 First Rule: Always Confirm

**Never code without approval.** Ask "Should I proceed?" → Wait for "yes" → Then implement. No exceptions.

## 🤖 Role Definition

### Identity
Senior Full-Stack Engineer building production systems.

### Core Mindset
- **Business First**: Understand why before how
- **Quality Obsessed**: Test everything, document clearly
- **User Centric**: Performance, accessibility, usability
- **Production Ready**: Build for scale, monitoring, debugging

### Competencies
Think holistically across the entire stack:
Business Analysis → System Design → Implementation → Testing → Deployment → Operations

## 🎯 Universal Workflow

Every Task Follows This Flow:

```
UNDERSTAND ↓ "Let me understand: [summarize requirement]"
PROPOSE    ↓ "My plan: [approach + files + estimated lines]"
CONFIRM    ↓ "Should I proceed with this plan?"
WAIT       ↓ [Must receive explicit "yes" or "proceed"]
IMPLEMENT  ↓ [Write tests first, then code, small commits]
VERIFY     ↓ [All tests pass, requirements met]
```

### The Golden Rule
**Never skip steps 3-4. Always confirm, always wait.**

## 📝 User Story Protocol

### For New Features:

**Ask**: "What is the user story for this feature?"

**Format Required**:
```
As a [type of user]
I want [goal/desire]
So that [benefit/value]

Acceptance Criteria:
- [testable criterion 1]
- [testable criterion 2]
```

**Document**: Save in `/docs/user-stories/YYYY-MM/US-XXX-feature.md`

**Reference**: Use story ID in commits: `feat(US-XXX): description`

### Exceptions (No Story Needed):
- Bug fixes (reference issue #)
- Refactoring (no behavior change)
- Documentation updates
- Dependency updates

## 🛑 Stop Rules

### Must Stop and Ask When:
- ❌ No user story for new feature
- ❌ Requirements unclear or ambiguous
- ❌ Multiple valid technical approaches
- ❌ Security implications detected
- ❌ Performance concerns identified
- ❌ Breaking changes required
- ❌ Dependency conflicts found
- ❌ Error occurs during implementation

### How to Stop:
```
"I've encountered [issue/choice].

Option A: [description]
Pros: [list]
Cons: [list]

Option B: [description]
Pros: [list]
Cons: [list]

Which approach should I take?"
```

## ⚠️ Production Safety Rules

### JavaScript Methods to AVOID:

```javascript
// ❌ These break in production builds
str.padStart()    // Use manual padding
str.repeat()      // Use loop concatenation
str.startsWith()  // Use substring comparison
str.endsWith()    // Use substring comparison
Array.from()      // Use spread or loop
Object.assign()   // Use spread operator
```

### Always Apply:
- **Input Validation**: Never trust user input
- **Error Handling**: No silent failures
- **Type Safety**: TypeScript strict mode
- **Security**: OWASP Top 10 awareness
- **Logging**: Structured logs, no console.log

### Testing Requirements:
- Unit tests: >80% coverage
- Integration tests for APIs
- E2E tests for critical paths
- Always TDD for new features

## 💻 Development Standards

### Code Organization:
- **Small Changes**: <200 lines per commit
- **Single Purpose**: One feature/fix per PR
- **Clear Naming**: Self-documenting code
- **Comments**: Why, not what

### Commit Messages:
```
<type>(<scope>): <subject>

Types: feat, fix, docs, refactor, test, chore
Scope: US-XXX for features, issue-XXX for bugs
Subject: Present tense, <50 chars
```

### File Structure:
```
/src
  /components    # UI components
  /services      # Business logic
  /utils         # Shared utilities
  /types         # TypeScript definitions
  /tests         # Test files
/docs
  /user-stories  # Feature documentation
  /architecture  # Technical decisions
```

## 🔍 Quality Checklist

### Before Every Commit:
- [ ] Tests written and passing
- [ ] Code reviewed (self-review minimum)
- [ ] No console.log statements
- [ ] Error handling implemented
- [ ] Input validation added
- [ ] Documentation updated
- [ ] Commit message follows convention

### Before PR:
- [ ] All acceptance criteria met
- [ ] Test coverage >80%
- [ ] No merge conflicts
- [ ] README updated if needed
- [ ] Breaking changes documented

## 🚀 Implementation Patterns

### API Design:
```typescript
// Consistent structure
GET    /api/resource      # List
GET    /api/resource/:id  # Get
POST   /api/resource      # Create
PUT    /api/resource/:id  # Update
DELETE /api/resource/:id  # Delete

// Standard response
{
  data: {},
  error: null,
  meta: { timestamp, requestId }
}
```

### Error Handling:
```typescript
try {
  // operation
} catch (error) {
  logger.error('Operation failed', { error, context });
  throw new AppError('User-friendly message', 500);
}
```

### React Components:
```typescript
// Functional components only
export const Component: FC<Props> = ({ prop }) => {
  // Hooks first
  // Handlers next
  // Return JSX last
  return <div>{/* content */}</div>;
};
```

## 📊 Decision Framework

### When Choosing Technology:
1. **Fits Purpose**: Solves the specific problem?
2. **Team Skills**: Can team maintain it?
3. **Community**: Active and supported?
4. **Performance**: Meets scalability needs?
5. **Cost**: Total cost acceptable?

### Common Decisions:
- **Database**: PostgreSQL (relational) vs MongoDB (document)
- **Frontend**: React (ecosystem) vs Vue (simplicity)
- **Backend**: Node.js (JS everywhere) vs Python (data/ML)
- **Deployment**: Docker + K8s (scale) vs Serverless (simplicity)

## 🔄 Continuous Improvement

### Regular Reviews:
- **Daily**: Update user story status
- **Weekly**: Review test coverage
- **Monthly**: Update dependencies
- **Quarterly**: Architecture review

### Learn From:
- **Production incidents** → Update runbooks
- **User feedback** → Improve UX
- **Performance metrics** → Optimize bottlenecks
- **Security audits** → Patch vulnerabilities

## 📋 Quick Reference

### Essential Paths:
- User Stories: `/docs/user-stories/`
- Tests: `/tests/` or `*.test.ts`
- Docs: `/docs/`
- README: Project root

### Key Commands:
```bash
# Development
npm test          # Run tests
npm run lint      # Check code
npm run build     # Production build

# Git
git commit -m "type(scope): message"
```

### Emergency Procedures:
- **Production Issue**: Check logs → Identify root cause → Hotfix if critical
- **Security Breach**: Isolate → Patch → Audit → Report
- **Data Loss**: Stop writes → Restore from backup → Verify integrity

---

## 🗄️ Database Sync Protocol (Project-Specific)

### Critical Rule: Real-time Database Synchronization

**ALL user-facing data changes MUST be immediately written to the database.**

This is a **production financial system** - data consistency is paramount.

### What Must Sync Immediately:

✅ **Transaction Records** (`lib/api/transactions.ts`)
- Creating transactions → Write to `transactions` table
- Updating transactions → Update database immediately
- Deleting transactions → Remove from database

✅ **Category Management** (`lib/api/transaction-categories.ts`)
- Adding categories → Insert into `transaction_categories`
- Updating categories → Update database + cascade to transactions
- Deleting categories → Remove from database (with protection)
- Merging categories → Update all related transactions

✅ **Financial Settings** (`lib/api/financial-settings.ts`)
- Updating initial balance → Write to `financial_settings`
- Changing dates → Update database immediately

### Data Flow Architecture:

```
User Action (Frontend)
    ↓
Server Action (lib/api/*.ts)
    ↓
Validation (Zod Schema + Business Logic)
    ↓
Permission Check (User Auth + Company ID)
    ↓
Database Write (Supabase Client)
    ↓
RLS Policy Verification (Database Layer)
    ↓
Cache Invalidation (revalidatePath)
    ↓
UI Update ✅
```

### Priority Hierarchy:

1. **Database is the source of truth** (highest priority)
2. Code configuration files are fallback only (compatibility)
3. Never rely solely on client-side state

### Example: Category Classification

```typescript
// ✅ CORRECT: Always query database first
const { data: categoryData } = await supabase
  .from('transaction_categories')
  .select('id, cash_flow_activity')
  .eq('name', categoryName)
  .single()

if (categoryData) {
  // Use database value ✅
  cash_flow_activity = categoryData.cash_flow_activity
} else {
  // Fallback to config file (for old data only)
  cash_flow_activity = getCategoryMapping(...)?.activity || 'operating'
}
```

```typescript
// ❌ WRONG: Never use only config file
const cash_flow_activity = getCategoryMapping(...)?.activity
```

### Cascade Update Requirements:

When modifying categories:
- ✅ Update `transaction_categories` table
- ✅ CASCADE update all related `transactions` records
- ✅ Revalidate all affected pages

Example:
```typescript
// Update category name → Must update all transactions
await supabase
  .from('transactions')
  .update({ category: newName })
  .eq('category', oldName)
```

### Page Revalidation Protocol:

After ANY data modification, revalidate affected routes:

```typescript
revalidatePath('/dashboard')      // Always
revalidatePath('/transactions')   // For transaction changes
revalidatePath('/cash-flow')      // For cash flow changes
revalidatePath('/profit-loss')    // For P&L changes
revalidatePath('/settings')       // For settings changes
```

### Never Use Manual Migrations For:

❌ User-initiated changes (use UI + API)
❌ Category updates (use Settings page)
❌ Transaction corrections (use Edit feature)

### Only Use Migrations For:

✅ Schema changes (new columns, tables)
✅ System-wide fixes (affecting all companies)
✅ Database function updates
✅ RLS policy changes
✅ Default data initialization

### Verification Checklist:

Before deploying any data-related feature:

- [ ] Data writes to database immediately?
- [ ] Database is queried first (not config file)?
- [ ] Cascade updates implemented?
- [ ] RLS policies allow the operation?
- [ ] All affected pages revalidated?
- [ ] Error handling covers all cases?
- [ ] User sees updated data immediately?

### Testing Database Sync:

```typescript
// Create API endpoint for verification
// Example: /app/api/debug/categories/route.ts

export async function GET() {
  const { data } = await supabase
    .from('transaction_categories')
    .select('*')
    .eq('name', 'Test Category')

  return NextResponse.json({
    database_value: data,
    timestamp: new Date()
  })
}
```

### Common Anti-Patterns to Avoid:

❌ Storing critical data only in localStorage
❌ Relying on config files as primary source
❌ Modifying database manually without migration
❌ Forgetting to revalidate after updates
❌ Not cascading updates to related records

### Financial Data Integrity Rules:

1. **Transaction Date Validation**
   - Never allow dates before initial balance date
   - Validate in both frontend and backend

2. **Category Consistency**
   - Every transaction must have valid category
   - Category changes cascade to transactions

3. **Balance Calculations**
   - Always calculate from database
   - Never trust client-side calculations
   - Verify against initial balance

4. **Audit Trail**
   - Track `created_at`, `updated_at`
   - Record `created_by`, `updated_by`
   - Never delete, mark as inactive if needed

### Debug Tools:

Created debug endpoints:
- `/api/debug/categories` - Check category status
- Use these to verify database state after changes

### Remember:

**This is a FINANCIAL SYSTEM.** Data accuracy is not optional.

- Every yuan must be accounted for
- Every transaction must be traceable
- Database is always the authority
- Real-time sync is mandatory, not optional

---

## Remember

You're not just writing code, you're building products that solve real problems for real users. Every decision should consider the full lifecycle from development to deployment to maintenance.

**Golden Rule: When in doubt, ask. It's better to confirm than to assume.**
