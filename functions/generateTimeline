function generateTimeline(tasks, deadline, holidays, division) {
  // Parse the escaped JSON string to a JavaScript object
  const holidaysObj = JSON.parse(holidays);

  let currentDate = new Date(deadline);
  currentDate.setDate(currentDate.getDate() - 2);

  const timeline = [];
  const holidayNotes = [];

  for (let i = tasks.length - 1; i >= 0; i--) {
    const task = tasks[i];
    const duration = parseInt(task.name, 10);

    let taskStartDate = new Date(currentDate); // Reset taskStartDate for each task

    for (let j = 0; j < duration; j++) {
      taskStartDate.setDate(taskStartDate.getDate() - 1);

      // Weekend adjustment
      if (taskStartDate.getDay() === 0) {
        taskStartDate.setDate(taskStartDate.getDate() - 2);
      } else if (taskStartDate.getDay() === 6) {
        taskStartDate.setDate(taskStartDate.getDate() - 1);
      }

      // Holiday adjustment (with corrected date format)
      const formattedDate = taskStartDate.toISOString().slice(0, 10); // Format date as YYYY-MM-DD
      const holiday = holidaysObj[division].events.find(event => event.date === formattedDate);
      if (holiday) {
        taskStartDate.setDate(taskStartDate.getDate() - 1);
        holidayNotes.push(`Task "${task.value}" adjusted due to public holiday (${holiday.title}) on ${formattedDate}`);
        j--; // Decrement j to account for the holiday
      }

      // Re-check for weekend after holiday adjustment
      if (taskStartDate.getDay() === 0) {
        taskStartDate.setDate(taskStartDate.getDate() - 2);
        j--; // Decrement j to account for the weekend
      } else if (taskStartDate.getDay() === 6) {
        taskStartDate.setDate(taskStartDate.getDate() - 1);
        j--; // Decrement j to account for the weekend
      }
    }

    const year = taskStartDate.getFullYear();
    const month = String(taskStartDate.getMonth() + 1).padStart(2, '0');
    const day = String(taskStartDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    timeline.unshift({
      ...task,
      date: formattedDate,
    });

    currentDate = new Date(taskStartDate); // Update currentDate for the next task
  }


  // Check if the first task in the timeline is in the past or today
  const firstTaskDate = new Date(timeline[0].date);
  const today = new Date();

  if (firstTaskDate <= today) {
    // Calculate the timeline duration in days
    const lastTaskDate = new Date(timeline[timeline.length - 1].date);
    const timeDiff = Math.abs(lastTaskDate - firstTaskDate);
    const diffDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    // Calculate suggested due date by adding the timeline duration to today
    let suggestedDueDate = new Date();
    suggestedDueDate.setDate(today.getDate() + diffDays);

    // Adjust suggestedDueDate to avoid weekends (always move forward)
    while (suggestedDueDate.getDay() === 0 || suggestedDueDate.getDay() === 6) {
      suggestedDueDate.setDate(suggestedDueDate.getDate() + 1); // Move to the next day
    }

    // Format the suggested due date as YYYY-MM-DD
    const year = suggestedDueDate.getFullYear();
    const month = String(suggestedDueDate.getMonth() + 1).padStart(2, '0');
    const day = String(suggestedDueDate.getDate()).padStart(2, '0');
    const formattedSuggestedDueDate = `${year}-${month}-${day}`;

    return {
      timeline,
      holidayNotes: [],
      error: {
        message: "Timeline starts in the past. Please adjust the due date.",
        suggestedDueDate: formattedSuggestedDueDate
      }
    };
  }

  return { timeline, holidayNotes };
}