# Contributing to Daylume

Thank you for your interest in contributing to Daylume! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome diverse perspectives and experiences
- Focus on constructive feedback
- Report inappropriate behavior to the maintainers

## How to Contribute

### 1. Reporting Bugs

**Before creating a bug report:**
- Check existing [issues](https://github.com/TechGuruServices/daylume-main/issues)
- Search closed issues in case it's already been fixed

**When creating a bug report, include:**
- Clear title and description
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots/videos if applicable
- Environment (OS, browser, Node version)

### 2. Suggesting Features

**Before suggesting a feature:**
- Check existing [issues](https://github.com/TechGuruServices/daylume-main/issues) and [discussions](https://github.com/TechGuruServices/daylume-main/discussions)
- Make sure it aligns with project goals

**When suggesting a feature, include:**
- Clear title and description
- Use case and benefits
- Examples of similar implementations
- Potential implementation approach (optional)

### 3. Making Code Changes

#### Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/daylume-main.git`
3. Add upstream remote: `git remote add upstream https://github.com/TechGuruServices/daylume-main.git`
4. Create a feature branch: `git checkout -b feat/your-feature-name`

#### Development

1. Follow the [DEVELOPMENT.md](./DEVELOPMENT.md) guide to set up your environment
2. Create a test for your change
3. Implement the feature/fix
4. Ensure tests pass: `npm test`
5. Run type check: `npm run check`
6. Build: `npm run build`

#### Testing Requirements

- **New features**: Add unit/integration tests
- **Bug fixes**: Add test reproducing the bug
- **Coverage**: Aim for >80% code coverage
- **Types**: All code must be fully typed (no `any`)

#### Code Style

```typescript
// ✅ Good: Fully typed, clear naming
async function saveUserSettings(settings: UserSettings): Promise<void> {
  await storage.set('user-settings', settings);
}

// ❌ Avoid: Loose typing, unclear names
async function save(data: any) {
  await storage.set('data', data);
}
```

```svelte
<!-- ✅ Good: Accessible, semantic HTML -->
<button
  on:click={handleDelete}
  aria-label="Delete item"
  type="button"
  class="btn btn-danger"
>
  Delete
</button>

<!-- ❌ Avoid: No aria-label, unclear intent -->
<button on:click={handleDelete} class="btn">
  <span class="mdi mdi-trash"></span>
</button>
```

#### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add dark mode support
fix: resolve calendar date parsing bug
docs: update development guide
refactor: simplify notification service
test: add tests for habit tracking
chore: update dependencies
```

Format:
```
<type>: <description>

<optional body explaining changes>

Fixes #123
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Dependency updates, config changes
- `style`: Formatting changes (Prettier, ESLint)
- `perf`: Performance improvements

#### Push & Create PR

```bash
# Update from upstream
git fetch upstream
git rebase upstream/main

# Push to your fork
git push origin feat/your-feature-name
```

Create a Pull Request on GitHub with:
- **Title**: Clear, descriptive title
- **Description**: Explain changes, why needed, any breaking changes
- **Checklist**:
  - [ ] Tests pass
  - [ ] Type checker passes
  - [ ] Build succeeds
  - [ ] No console errors/warnings
  - [ ] Accessibility checked (run through Lighthouse)
  - [ ] Updated documentation if needed

### 4. Reviewing Pull Requests

When reviewing PRs, check:
- ✅ Code follows style guide
- ✅ Tests cover changes
- ✅ TypeScript types are correct
- ✅ No `console.log` statements left
- ✅ No hardcoded values (use config/env)
- ✅ Accessibility standards met (a11y)
- ✅ Performance implications considered
- ✅ Breaking changes documented

## Branching Strategy

- `main`: Stable release branch
- `develop`: Development branch (not currently used, work on forks)
- Feature branches: `feat/feature-name`
- Bugfix branches: `fix/bug-name`
- Release branches: `release/v1.0.0`

## Commit Standards

- Write meaningful commit messages
- Keep commits atomic (one logical change per commit)
- Reference issues when applicable: `Fixes #123`

## Documentation

- Update README.md for major changes
- Add JSDoc comments to exported functions
- Update DEVELOPMENT.md for setup changes
- Add comments for complex logic

## Release Process

Maintainers follow [Semantic Versioning](https://semver.org/):
- MAJOR: Breaking changes
- MINOR: New features
- PATCH: Bug fixes
- Example: `v1.2.3`

## Questions?

- **Technical questions**: Open a [Discussion](https://github.com/TechGuruServices/daylume-main/discussions)
- **General questions**: Email maintainers or check documentation
- **Urgent issues**: Create an issue with `priority: high` label

## Recognition

Contributors are recognized in:
- GitHub repository contributors list
- Release notes for significant contributions
- Special contributors section (coming soon)

## License

By contributing, you agree that your contributions will be licensed under the project's license.

---

Thank you for helping make Daylume better! 🎉
