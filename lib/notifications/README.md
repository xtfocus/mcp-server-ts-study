# Notification System

A flexible, hierarchical notification system for MCP tools that supports multiple levels of abstraction from generic notifications to specialized progress tracking.

## Architecture Overview

```
BaseNotifier (Interface)
    ↓
BaseNotificationHandler (Abstract Base)
    ↓
├── ProgressTracker (Step-based progress)
└── HierarchicalProgressTracker (Phase-based progress)
```

## Quick Start

### 1. Generic Notifications (No assumptions about task nature)
```typescript
import { withNotifications } from '@/lib/mcp/simplified-decorators';

export const myTool = {
  name: 'my_tool',
  handler: withNotifications(async (notifier, args) => {
    if (notifier) {
      await notifier.notify("Starting process", { step: 1 });
      // ... do work ...
      await notifier.notify("Process complete", { result: "success" });
      await notifier.complete("All done!");
    }
  })
};
```

### 2. Step-based Progress Tracking
```typescript
import { withProgressTracking } from '@/lib/mcp/simplified-decorators';

export const myTool = {
  name: 'my_tool',
  handler: withProgressTracking(async (tracker, args) => {
    if (tracker) {
      await tracker.setTotal(5);
      for (let i = 0; i < 5; i++) {
        await tracker.updateProgress(`Step ${i + 1}`);
        // ... do work ...
      }
    }
  })
};
```

### 3. Phase-based Progress Tracking
```typescript
import { withPhases, createPhases } from '@/lib/mcp/simplified-decorators';

const phases = createPhases(
  { name: 'setup', weight: 0.2 },
  { name: 'process', weight: 0.6 },
  { name: 'cleanup', weight: 0.2 }
);

export const myTool = {
  name: 'my_tool',
  handler: withPhases(phases, async (tracker, args) => {
    if (tracker) {
      await tracker.startPhase('setup');
      await tracker.updatePhaseProgress(1, 'Setup complete');
      
      await tracker.startPhase('process');
      await tracker.updatePhaseProgress(0.5, 'Halfway done');
      await tracker.updatePhaseProgress(1, 'Processing complete');
      
      await tracker.startPhase('cleanup');
      await tracker.completePhase('cleanup', 'All done!');
    }
  })
};
```

## Available Decorators

| Decorator | Use Case | Best For |
|-----------|----------|----------|
| `withNotifications` | Generic notifications | Custom workflows, status updates |
| `withProgressTracking` | Step-based progress | Known number of steps |
| `withPhases` | Phase-based progress | Complex multi-phase operations |

## Configuration

```typescript
const config = {
  logLevel: 'info',        // 'debug' | 'info' | 'warn' | 'error' | 'silent'
  maxHistorySize: 1000,    // Maximum progress history entries
  batchSize: 10,           // Batch size for high-frequency updates
  batchTimeout: 100        // Batch timeout in milliseconds
};
```

## Error Handling

All notifiers provide consistent error handling:
- Automatic error notifications on failure
- Graceful degradation when progress tokens are missing
- Silent failure for notification errors (doesn't break tool execution)

## Best Practices

1. **Choose the right abstraction level**: Use the simplest notifier that meets your needs
2. **Handle null notifiers**: Always check if notifier exists before using
3. **Provide meaningful messages**: Include context in notification messages
4. **Use appropriate data**: Include relevant data objects for debugging
5. **Complete operations**: Always call `complete()` or `error()` to finish properly
