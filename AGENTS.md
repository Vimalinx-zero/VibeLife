# FlowStudy - Agent Guidelines

This document provides guidelines for agentic coding assistants working on the FlowStudy repository.

---

## Project Overview

**FlowStudy** is an intelligent learning management platform with:
- Smart Quiz System: Personalized recommendations
- Note Management: Markdown editor with bidirectional links (`[[note:id]]`)
- Mistake Vault: Error collection and mastery tracking
- Anki Flashcards: SM-2 spaced repetition algorithm
- Knowledge Integration: Cross-linking questions, notes, mistakes, cards

**Tech Stack**:
- Frontend: React 19.2.0 + Vite 7.2.4 + TypeScript 5.9.3 + Tailwind CSS
- Backend: FastAPI 0.104+ + SQLAlchemy + SQLite 3

---

## Quick Commands

### Build & Lint

```bash
# Frontend
cd frontend
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build
npm run lint         # ESLint check
npx tsc --noEmit # TypeScript type check

# Backend
cd backend
python main.py        # Start server (http://localhost:8000)

# Both
./start.sh start       # Start both services
./start.sh stop        # Stop services
```

### Testing

```bash
# Run all backend tests
cd backend && python test_api.py

# Run individual backend test
cd backend && python -c "from test_api import test_auth_login; test_auth_login()"
python -c "from test_api import test_notes_create; test_notes_create('TOKEN')"
```

**Note**: Each test in `test_api.py` is a standalone function (`test_<name>()`) runnable independently.

---

## Code Style Guidelines

### Naming Conventions

| Entity | Convention | Example |
|---------|-------------|----------|
| Components | PascalCase | `GlassCard.tsx`, `NoteEditor.tsx` |
| Files | camelCase or kebab-case | `noteUtils.ts`, `api-client.ts` |
| Variables | camelCase | `userName`, `setLoading`, `handleClick` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL`, `DAILY_EASE_INCREASE_CAP` |
| Interfaces/Types | PascalCase | `Card`, `NoteItem`, `UserProfile` |
| Functions | camelCase | `loadNode()`, `saveNote()` |
| React Hooks | camelCase with "use" prefix | `useState`, `useEffect`, `useMemo` |

### TypeScript Guidelines

**Type Safety**:
```typescript
// ✅ Always specify generic type
const [cards, setCards] = useState<Card[]>([]);
const [selectedId, setSelectedId] = useState<string | null>(null);

// ❌ Avoid implicit any
const [items, setItems] = useState([]);
```

**API Response Typing**:
```typescript
// Always access .data from axios responses
const response = await apiClient.get('/api/cards');
const cards: Card[] = response.data;
```

### React Component Guidelines

```typescript
// ✅ Use functional components with hooks
const MyComponent = ({ prop }: Props) => {
  const [state, setState] = useState();
  return <div>{state}</div>;
};

// Performance: Use memo for expensive components
const ExpensiveComponent = memo(({ data }: Props) => {
  return <div>{/* render */}</div>;
});
```

### Error Handling

```typescript
// API calls with user feedback
try {
  const response = await apiClient.get('/api/data');
  setData(response.data);
} catch (error) {
  console.error('Failed to load data:', error);
  toast.error('Failed to load data');
}

// Unknown type handling
catch (error) {
  const err = error as Error;
  console.error(err.message);
}
```

### Backend Python Guidelines

**Route Definition**:
```python
@router.get("/api/endpoint")
async def get_endpoint(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Endpoint description"""
    return {"data": result}
```

**Database Operations**:
```python
# Always use user isolation
query = db.query(models.Model).filter(
    models.Model.user_id == current_user_id
)

# JSON field modification (SQLite)
from sqlalchemy.orm.attributes import flag_modified
model.tags = new_tags
flag_modified(model, "tags")
```

### Git Commit Conventions

```bash
feat:     New feature
fix:       Bug fix
docs:      Documentation update
refactor:   Code refactoring
perf:       Performance optimization
test:       Tests
chore:      Build/tool changes
```

---

## Key Reminders for Agents

1. **Type Safety** - No implicit `any`, use interfaces for complex types
2. **User Isolation** - All backend queries MUST filter by `user_id`
3. **Error Handling** - All async operations should have try-catch with user feedback
4. **Performance** - Use `memo`, `useMemo`, `useCallback` where appropriate
5. **Consistency** - Follow existing patterns in the codebase
6. **Testing** - Run relevant tests after changes
7. **Build Check** - Run `npm run build` and `npx tsc --noEmit` before committing
