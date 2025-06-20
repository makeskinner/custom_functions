/**
 * Summarizes time entries per user, breaking down time into projects and clients,
 * and providing breakdowns by day of the week and billable status.
 * This function encapsulates all necessary helpers and is designed to be a
 * single top-level function, making it safe and compatible with sandpit environments
 * like Make.com's "Run a function" modules.
 *
 * @param {Array<Object>} data An array where each object represents a user's
 * time entries, with a 'User' key for the user's name
 * and a 'TimeEnties' array containing their individual
 * time records.
 * Example: [{ "User": "J Helyes", "TimeEnties": [...] }]
 * @returns {Object} A comprehensive summary object with calculated hours in HH:MM format.
 * Includes total and billable hours per user, daily breakdowns,
 * and duration per project and client.
 */
function summarizeTime(data) {

    /**
     * Converts milliseconds to a human-readable HH:MM format.
     * This helper function is nested to ensure 'summarizeTime' is the only top-level function.
     * @param {number} milliseconds The duration in milliseconds.
     * @returns {string} The formatted time string (HH:MM).
     */
    function formatMillisecondsToHHMM(milliseconds) {
        if (milliseconds === 0) {
            return '00:00';
        }
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        const formattedHours = String(hours).padStart(2, '0');
        const formattedMinutes = String(minutes).padStart(2, '0');

        return `${formattedHours}:${formattedMinutes}`;
    }

    const summary = {};
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    data.forEach(userEntry => {
        // Use 'User' and 'TimeEnties' keys as per your latest JSON structure
        const userName = userEntry.User;
        const timeEntries = userEntry.TimeEnties;

        summary[userName] = {
            totalDurationMs: 0,
            billableDurationMs: 0,
            totalHours: '00:00', // Initialize as string for HH:MM format
            billableHours: '00:00', // Initialize as string for HH:MM format
            totalHoursByDay: Object.fromEntries(daysOfWeek.map(day => [day, 0])), // Initialize with 0ms
            billableHoursByDay: Object.fromEntries(daysOfWeek.map(day => [day, 0])), // Initialize with 0ms
            projects: {}, // Raw milliseconds will be stored here first
            clients: {} // Raw milliseconds will be stored here first
        };

        timeEntries.forEach(record => {
            const durationMs = record.dur || 0;
            // Default to 'Without client' and 'Without project' if null/undefined
            const client = record.client || 'Without client';
            const project = record.project || 'Without project';
            const startDate = record.start ? new Date(record.start) : null;
            // Handle cases where startDate might be invalid
            const dayOfWeek = (startDate && !isNaN(startDate.getTime())) ? daysOfWeek[startDate.getDay()] : 'Unknown Day';

            // Determine if the entry is billable
            // Assumption: An entry is billable if the client is NOT 'IT Internal'
            // AND the project is NOT 'Admin' AND both client and project are specified.
            const isBillable = (client !== 'IT Internal' && project !== 'Admin' && client !== 'Without client' && project !== 'Without project');

            // Accumulate total duration for the user
            summary[userName].totalDurationMs += durationMs;
            if (startDate && !isNaN(startDate.getTime())) {
                summary[userName].totalHoursByDay[dayOfWeek] += durationMs;
            }


            // Accumulate billable duration for the user
            if (isBillable) {
                summary[userName].billableDurationMs += durationMs;
                if (startDate && !isNaN(startDate.getTime())) {
                    summary[userName].billableHoursByDay[dayOfWeek] += durationMs;
                }
            }

            // Accumulate duration per project (overall)
            if (!summary[userName].projects[project]) {
                summary[userName].projects[project] = 0;
            }
            summary[userName].projects[project] += durationMs;

            // Accumulate duration per client and per project within each client
            if (!summary[userName].clients[client]) {
                summary[userName].clients[client] = { totalDurationMs: 0, projects: {} };
            }
            summary[userName].clients[client].totalDurationMs += durationMs;

            if (!summary[userName].clients[client].projects[project]) {
                summary[userName].clients[client].projects[project] = 0;
            }
            summary[userName].clients[client].projects[project] += durationMs;
        });

        // Convert all accumulated milliseconds to HH:MM format
        summary[userName].totalHours = formatMillisecondsToHHMM(summary[userName].totalDurationMs);
        summary[userName].billableHours = formatMillisecondsToHHMM(summary[userName].billableDurationMs);

        // Convert daily totals to HH:MM
        for (const day in summary[userName].totalHoursByDay) {
            summary[userName].totalHoursByDay[day] = formatMillisecondsToHHMM(summary[userName].totalHoursByDay[day]);
            summary[userName].billableHoursByDay[day] = formatMillisecondsToHHMM(summary[userName].billableHoursByDay[day]);
        }

        // Convert overall project totals to HH:MM
        for (const project in summary[userName].projects) {
            summary[userName].projects[project] = formatMillisecondsToHHMM(summary[userName].projects[project]);
        }

        // Convert client and nested project totals to HH:MM
        for (const clientName in summary[userName].clients) {
            const clientData = summary[userName].clients[clientName];
            clientData.totalHours = formatMillisecondsToHHMM(clientData.totalDurationMs);
            for (const projectName in clientData.projects) {
                clientData.projects[projectName] = formatMillisecondsToHHMM(clientData.projects[projectName]);
            }
            delete clientData.totalDurationMs; // Remove raw milliseconds after conversion
        }

        // Remove raw milliseconds from top level after conversion
        delete summary[userName].totalDurationMs;
        delete summary[userName].billableDurationMs;
    });

    return summary;
}
