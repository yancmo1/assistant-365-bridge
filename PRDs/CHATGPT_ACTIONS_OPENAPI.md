# Assistant 365 Bridge — ChatGPT Actions OpenAPI Spec

Save this file as something like:

`CHATGPT_ACTIONS_OPENAPI.md`

When you’re ready to wire it into ChatGPT:

1. Copy the **YAML block below** (from `openapi:` down).
2. In the ChatGPT Custom GPT builder, go to **Actions → Import from OpenAPI**.
3. Paste the YAML.
4. Configure the `X-Assistant-Key` value in the UI using your real secret.

---

```yaml
openapi: 3.1.0
info:
  title: Assistant 365 Bridge
  version: 1.0.0
  description: |
    Assistant 365 Bridge provides an HTTP API that lets an AI assistant
    create, list, and complete tasks in Microsoft To Do on behalf of a single user.
    All endpoints require an API key header and are intended to be called
    only by trusted assistant clients (e.g., ChatGPT or internal tools).

servers:
  - url: https://assistant.yancmo.xyz

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-Assistant-Key

  schemas:
    PromoteTaskRequest:
      type: object
      description: |
        A request to promote a task into Microsoft To Do. The assistant should
        always provide a clear title, and optionally notes, importance, dueDate,
        category (work/personal), and any external identifier it uses to track
        the task in its own context.
      required:
        - title
      properties:
        title:
          type: string
          description: Short, human-readable task title.
          example: "Review Campaign Monitor vs Constant Contact"
        notes:
          type: string
          description: Optional detailed notes or context for the task.
          example: "Check pricing, template editor, and survey/poll features."
        importance:
          type: string
          description: Importance level for the task.
          enum: [low, normal, high]
          default: normal
          example: high
        dueDate:
          type: string
          description: |
            Optional due date in YYYY-MM-DD format (no time). The backend will
            interpret this using the configured timezone (e.g., America/Chicago).
          example: "2025-12-01"
        category:
          type: string
          description: |
            Logical category for the task. The backend maps this to specific
            To Do lists (e.g., "work" → Work list, "personal" → Tasks list).
          enum: [work, personal]
          example: work
        source:
          type: string
          description: Optional label indicating the source system or assistant.
          example: "chatgpt-task-inbox"
        externalId:
          type: string
          description: |
            Optional ID used by the assistant to correlate this task with its
            own internal representation (e.g., "task-3" or a UUID).
          example: "task-3"

    PromoteTaskResponse:
      type: object
      description: Response returned after attempting to create a To Do task.
      properties:
        status:
          type: string
          description: |
            Result of the operation. "created" means the Graph call succeeded.
          enum: [created, stubbed, error]
          example: created
        message:
          type: string
          description: Human-readable summary of the result.
          example: "Task created successfully in Microsoft To Do."
        title:
          type: string
          description: Echo of the task title that was created.
          example: "Review Campaign Monitor vs Constant Contact"
        category:
          type: string
          description: Category used for routing (e.g., work or personal).
          example: work
        listDisplayName:
          type: string
          description: The name of the Microsoft To Do list where the task was created.
          example: "Work"
        microsoftTaskId:
          type: string
          description: The ID of the created task in Microsoft To Do.
          example: "AAMkAGI2TAAA=" 
        dueDate:
          type: string
          description: Due date of the task (if set) in YYYY-MM-DD format.
          example: "2025-12-01"
        externalId:
          type: string
          description: Echo of the external ID provided by the caller, if any.
          example: "task-3"
        rawGraphResponse:
          description: |
            Optional raw or partial Graph response (may be omitted or redacted).
          nullable: true

    TaskItem:
      type: object
      description: A normalized view of a Microsoft To Do task as returned by this API.
      properties:
        microsoftTaskId:
          type: string
          description: Unique ID of the task in Microsoft To Do.
          example: "AAMkAGI2TAAA="
        title:
          type: string
          description: Task title.
          example: "Review Campaign Monitor vs Constant Contact"
        status:
          type: string
          description: Current completion status of the task.
          enum: [notStarted, inProgress, completed, waitingOnOthers, deferred]
          example: notStarted
        importance:
          type: string
          description: Importance level.
          enum: [low, normal, high]
          example: normal
        category:
          type: string
          description: Logical category that was used to route this task.
          example: work
        listDisplayName:
          type: string
          description: Name of the To Do list containing the task.
          example: "Work"
        createdDateTime:
          type: string
          description: ISO 8601 timestamp when the task was created.
          example: "2025-11-28T03:21:45Z"
        dueDate:
          type: string
          description: Due date in YYYY-MM-DD format, if set.
          nullable: true
          example: "2025-12-01"
        completedDateTime:
          type: string
          description: ISO 8601 timestamp when the task was completed, if applicable.
          nullable: true
          example: "2025-11-30T15:42:10Z"
        externalId:
          type: string
          description: External ID, if used by the caller when creating the task.
          nullable: true
          example: "task-3"
        source:
          type: string
          description: Source value (e.g., "chatgpt-task-inbox"), if provided.
          nullable: true
          example: "chatgpt-task-inbox"

    ListTasksResponse:
      type: object
      description: Response for a task listing operation.
      properties:
        status:
          type: string
          description: Result of the listing operation.
          enum: [ok, error]
          example: ok
        category:
          type: string
          description: Category used for the query, if provided.
          nullable: true
          example: work
        listDisplayName:
          type: string
          description: Name of the list queried.
          example: "Work"
        tasks:
          type: array
          description: Array of tasks returned by the query.
          items:
            $ref: "#/components/schemas/TaskItem"
        message:
          type: string
          description: Optional human-readable note or error message.
          nullable: true

    CompleteTaskRequest:
      type: object
      description: Request to mark a task complete.
      required:
        - microsoftTaskId
      properties:
        microsoftTaskId:
          type: string
          description: ID of the task to complete in Microsoft To Do.
          example: "AAMkAGI2TAAA="
        category:
          type: string
          description: |
            Optional category that may help route to the correct list. If omitted,
            the backend will attempt to resolve the task ID globally.
          nullable: true
          example: work

    CompleteTaskResponse:
      type: object
      description: Response returned after attempting to complete a task.
      properties:
        status:
          type: string
          description: Result of the completion attempt.
          enum: [completed, notFound, error]
          example: completed
        microsoftTaskId:
          type: string
          description: ID of the task that was targeted.
          example: "AAMkAGI2TAAA="
        category:
          type: string
          description: Category used for routing, if applicable.
          nullable: true
          example: work
        completedDateTime:
          type: string
          description: Completion timestamp if the task was successfully completed.
          nullable: true
          example: "2025-11-30T15:42:10Z"
        message:
          type: string
          description: Human-readable summary or error.
          example: "Task marked as completed."

paths:
  /promoteTask:
    post:
      operationId: promoteTask
      summary: Promote a task into Microsoft To Do.
      description: |
        Creates a new task in Microsoft To Do based on the provided input.
        The assistant should provide a clear title and as much context as
        is helpful in the notes. Category may be used to route into different
        lists (e.g., work vs personal).
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/PromoteTaskRequest"
            example:
              title: "Contact Nate about internal server & CI/CD"
              notes: "Confirm whether LMS changes from GitHub are being pulled and discuss CI/CD options."
              importance: high
              dueDate: "2025-12-01"
              category: work
              source: "chatgpt-task-inbox"
              externalId: "task-3"
      responses:
        "200":
          description: Task successfully created (or stubbed) in Microsoft To Do.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/PromoteTaskResponse"
        "400":
          description: Invalid request (e.g., missing title or invalid field values).
        "401":
          description: Missing or invalid API key.
        "500":
          description: Server or Microsoft Graph error.

  /tasks:
    get:
      operationId: listTasks
      summary: List tasks from Microsoft To Do.
      description: |
        Lists tasks from Microsoft To Do, optionally filtered by category and
        limited in count. This is useful for daily reviews (e.g., "show my current
        work tasks") or summarization.
      security:
        - ApiKeyAuth: []
      parameters:
        - in: query
          name: category
          required: false
          schema:
            type: string
            enum: [work, personal]
          description: |
            Logical category to filter by (e.g., work or personal). This maps to
            underlying lists configured in the backend.
        - in: query
          name: top
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: 50
            default: 10
          description: Maximum number of tasks to return. Defaults to 10.
        - in: query
          name: includeCompleted
          required: false
          schema:
            type: boolean
            default: false
          description: Whether to include completed tasks. Defaults to false.
      responses:
        "200":
          description: A list of tasks from Microsoft To Do.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ListTasksResponse"
        "401":
          description: Missing or invalid API key.
        "500":
          description: Server or Microsoft Graph error.

  /completeTask:
    post:
      operationId: completeTask
      summary: Mark a task as completed in Microsoft To Do.
      description: |
        Marks a specific Microsoft To Do task as completed, identified by its
        task ID. Optionally, a category can be supplied to help route to the
        correct list.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CompleteTaskRequest"
            example:
              microsoftTaskId: "AAMkAGI2TAAA="
              category: work
      responses:
        "200":
          description: Task completion attempt result.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CompleteTaskResponse"
        "400":
          description: Invalid request (e.g., missing microsoftTaskId).
        "401":
          description: Missing or invalid API key.
        "404":
          description: Task not found or not accessible.
        "500":
          description: Server or Microsoft Graph error.
```