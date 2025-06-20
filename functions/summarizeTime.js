function summarizeTime(d){
    // Attempt to parse the input if it's a string.
    // If parsing fails or if 'd' is not a string, 'parsedData' will retain the original 'd'.
    let parsedData = d;
    if (typeof d === 'string') {
        try {
            parsedData = JSON.parse(d);
        } catch (e) {
            // If JSON parsing fails, it means the string is not valid JSON.
            // In this case, we let parsedData remain the original string 'd'.
            // The subsequent Array.isArray check and userEntry validation will then handle it.
            // console.warn("Input string is not valid JSON:", e); // For debug in Node.js
        }
    }

    function formatMillisecondsToHHMM(ms){if(0===ms)return"00:00";const ts=Math.floor(ms/1e3),h=Math.floor(ts/3600),m=Math.floor(ts%3600/60);const fh=String(h).padStart(2,"0"),fm=String(m).padStart(2,"0");return`${fh}:${fm}`}
    const sum={},dows=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    // Ensure 'parsedData' is an array for iteration
    const pd=Array.isArray(parsedData)?parsedData:[parsedData];
    
    pd.forEach(ue=>{
        const un=ue.User;
        const tes=ue.TimeEnties;
        if(!un||!Array.isArray(tes))return;
        sum[un]={totalDurationMs:0,billableDurationMs:0,totalHours:"00:00",billableHours:"00:00",totalHoursByDay:Object.fromEntries(dows.map(day=>[day,0])),billableHoursByDay:Object.fromEntries(dows.map(day=>[day,0])),projects:{},clients:{}};
        tes.forEach(rec=>{
            const dm=rec.dur||0;
            const cl=rec.client||"Without client";
            const pr=rec.project||"Without project";
            const sd=rec.start?new Date(rec.start):null;
            const dow=sd&&!isNaN(sd.getTime())?dows[sd.getDay()]:"Unknown Day";
            const ib=cl!=="IT Internal"&&pr!=="Admin"&&cl!=="Without client"&&pr!=="Without project";
            sum[un].totalDurationMs+=dm;
            if(sd&&!isNaN(sd.getTime()))sum[un].totalHoursByDay[dow]+=dm;
            if(ib){sum[un].billableDurationMs+=dm;if(sd&&!isNaN(sd.getTime()))sum[un].billableHoursByDay[dow]+=dm}
            if(!sum[un].projects[pr])sum[un].projects[pr]=0;
            sum[un].projects[pr]+=dm;
            if(!sum[un].clients[cl])sum[un].clients[cl]={totalDurationMs:0,projects:{}};
            sum[un].clients[cl].totalDurationMs+=dm;
            if(!sum[un].clients[cl].projects[pr])sum[un].clients[cl].projects[pr]=0;
            sum[un].clients[cl].projects[pr]+=dm
        });
        sum[un].totalHours=formatMillisecondsToHHMM(sum[un].totalDurationMs);
        sum[un].billableHours=formatMillisecondsToHHMM(sum[un].billableDurationMs);
        for(const day in sum[un].totalHoursByDay){sum[un].totalHoursByDay[day]=formatMillisecondsToHHMM(sum[un].totalHoursByDay[day]);sum[un].billableHoursByDay[day]=formatMillisecondsToHHMM(sum[un].billableHoursByDay[day])}
        for(const pr in sum[un].projects)sum[un].projects[pr]=formatMillisecondsToHHMM(sum[un].projects[pr]);
        for(const cln in sum[un].clients){
            const cld=sum[un].clients[cln];
            cld.totalHours=formatMillisecondsToHHMM(cld.totalDurationMs);
            for(const prn in cld.projects)cld.projects[prn]=formatMillisecondsToHHMM(cld.projects[prn]);
            delete cld.totalDurationMs
        }
        delete sum[un].totalDurationMs;
        delete sum[un].billableDurationMs
    });
    return sum
}
