# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release with comprehensive PR labeling system
- Branch-based label detection (hotfix/, fix/, rc/)
- Content-based intelligent labeling
- Comment command system (!action_required, !urgent, !breaking, !security)
- Team notification system
- Merge conflict detection
- Abandoned PR monitoring
- 20+ different label types with semantic colors
- Event-driven architecture supporting multiple GitHub events
- Flexible configuration options
- Comprehensive documentation and examples

### Features

- **Draft PRs**: Automatic `Status: Draft` labeling
- **Feature Classification**: `Feature: Base` and `Feature: Part` detection
- **Branch Detection**: Auto-detects `hotfix/`, `fix/`, and `rc/` branches
- **Content Intelligence**: Detects breaking changes, documentation, refactoring, performance, and security changes
- **Review Management**: In-progress, request changes, and approval tracking
- **Deployment Tracking**: Staging and production deployment labels
- **Conflict Detection**: Automatic merge conflict monitoring
- **Abandoned PR Detection**: Timeout-based abandoned PR identification
- **Command System**: Responds to comment commands
- **Team Notifications**: Configurable team ID for global notifications

### Technical

- Node.js 20 runtime
- Comprehensive error handling and logging
- Input validation
- Graceful degradation
- Cross-repository compatibility
- MIT License

## [1.0.0] - 2024-01-XX

### Added

- Initial release
- Complete PR lifecycle management
- Event-driven automation
- Smart label creation with auto-color coding
- Flexible configuration system
- Team notification capabilities
- Comment command system
- Comprehensive documentation
- Multiple usage examples
- CI/CD workflows
- Development tooling (ESLint, Prettier, Husky)
