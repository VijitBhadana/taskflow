import TaskCard from "./TaskCard.jsx";

export default function Column({
  column,
  allColumns,
  tasks,
  maxCount,
  isDragOver,
  onDragOverColumn,
  onDragLeaveColumn,
  onDropColumn,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onMoveTask,
  dragHandlers,
}) {
  const filledSegments = maxCount > 0 ? Math.max(1, Math.round((tasks.length / maxCount) * 5)) : 0;

  return (
    <div
      className={`column${isDragOver ? " is-drag-over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverColumn(column.id);
      }}
      onDragLeave={() => onDragLeaveColumn(column.id)}
      onDrop={(e) => {
        e.preventDefault();
        onDropColumn(column.id);
      }}
    >
      <div className="column__header">
        <div className="column__name">{column.name}</div>
        <div className="column__count">{tasks.length}</div>
      </div>

      <div className="column__meter" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={i < filledSegments ? "filled" : ""} />
        ))}
      </div>

      <div className="column__list">
        {tasks.length === 0 ? (
          <div className="column__empty">No tasks here. Drag one over, or add a new one below.</div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              columns={allColumns}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onMove={onMoveTask}
              dragHandlers={dragHandlers}
            />
          ))
        )}
      </div>

      <button className="column__add" onClick={() => onAddTask(column.id)}>
        + Add task
      </button>
    </div>
  );
}
