# Notification System Architecture

## Overview

The notification system provides a hierarchical, flexible approach to sending real-time notifications from MCP tools to clients. It supports multiple levels of abstraction from generic notifications to specialized progress tracking.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    MCP Tool Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  Tool 1: roll_dice    │  Tool 2: wait    │  Tool 3: custom    │
│  (withProgressTracking)│  (withProgressTracking)│  (withNotifications)│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Decorator Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  withNotifications()  │  withProgressTracking()  │  withPhases()  │
│  (Generic)           │  (Step-based)           │  (Phase-based) │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                Notification Handler Layer                      │
├─────────────────────────────────────────────────────────────────┤
│                    BaseNotificationHandler                     │
│                    (Abstract Base Class)                      │
│                           │                                   │
│        ┌──────────────────┼──────────────────┐                │
│        ▼                  ▼                  ▼                │
│  ProgressTracker    HierarchicalProgressTracker  Custom       │
│  (Step-based)       (Phase-based)              (Generic)      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Notification Service Layer                    │
├─────────────────────────────────────────────────────────────────┤
│                    NotificationService                         │
│                    (Core Service)                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MCP Protocol Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  notifications/progress  │  notifications/status  │  notifications/result_chunk │
│  (Progress Updates)      │  (Status Messages)     │  (Result Streaming)         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Client Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  MCP Inspector  │  Custom Client  │  Web Interface  │  CLI Tool │
│  (Testing)      │  (Integration)  │  (Dashboard)    │  (Scripts)│
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Tool Layer
- **Purpose**: Individual MCP tools that need to send notifications
- **Examples**: `roll_dice`, `wait`, `generic_notifier_demo`
- **Integration**: Uses decorators to wrap tool handlers

### 2. Decorator Layer
- **Purpose**: Provides easy integration between tools and notification handlers
- **Types**:
  - `withNotifications()`: Generic notifications, no assumptions
  - `withProgressTracking()`: Step-based progress tracking
  - `withPhases()`: Phase-based progress with weighted calculations

### 3. Notification Handler Layer
- **Base Class**: `BaseNotificationHandler` (abstract)
- **Specialized Classes**:
  - `ProgressTracker`: Step-based progress with history
  - `HierarchicalProgressTracker`: Phase-based progress with weights
  - Custom implementations for specific needs

### 4. Service Layer
- **NotificationService**: Core service for creating handlers and sending notifications

### 5. Protocol Layer
- **MCP Notifications**: Standard MCP notification methods
- **Types**: Progress, status, and result chunk notifications
- **Transport**: JSON-RPC 2.0 over HTTP/SSE

### 6. Client Layer
- **MCP Inspector**: Testing and debugging
- **Custom Clients**: Integration with existing applications
- **Web Interfaces**: Real-time dashboards
- **CLI Tools**: Command-line monitoring

## Data Flow

```
1. Tool Execution
   ↓
2. Decorator Wrapping
   ↓
3. Handler Creation
   ↓
4. Notification Sending
   ↓
5. MCP Protocol
   ↓
6. Client Reception
```

## Configuration

The system supports configuration at multiple levels:

- **Global**: Default settings for all notifications
- **Service**: Per-service configuration
- **Handler**: Per-handler configuration
- **Tool**: Per-tool configuration

## Error Handling

- **Graceful Degradation**: Works with or without progress tokens
- **Silent Failures**: Notification errors don't break tool execution
- **Comprehensive Logging**: Configurable logging levels
- **Error Recovery**: Automatic retry and fallback mechanisms

## Benefits

1. **Flexibility**: Multiple abstraction levels for different use cases
2. **Reusability**: Decorators can be applied to any tool
3. **Maintainability**: Clear separation of concerns
4. **Extensibility**: Easy to add new notification types
5. **Performance**: Configurable batching and queuing
6. **Reliability**: Robust error handling and logging
