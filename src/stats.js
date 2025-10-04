import { db } from "./model.js";

function runQuery(query, params) {
    return new Promise((res, rej) => {
        db.all(query, params, (e, r) => {
            if (e) {
                rej(e);
            } else {
                res(r);
            }
        })
    })
}

export async function getRequestsDayByDay() {
    let query = "SELECT COUNT(*) AS n, (date/86400000) AS day, MIN(date) as date FROM hits GROUP BY day ORDER BY day;";
    let db_result = await runQuery(query, []);
    let result = [];
    for (const i of db_result) {
        result.push({ x: new Date(i.date), y: i.n });
    }
    return result;
}

export async function getNumEnrollmentsDayByDay() {
    let query = "SELECT COUNT(*) AS n, (date/86400000) AS day, MIN(date) as date FROM enrollments GROUP BY day ORDER BY day;";
    let db_result = await runQuery(query, []);
    let result = [];
    for (const i of db_result) {
        if (result.length == 0) {
            result.push({ x: new Date(i.date), y: i.n });
        } else {
            result.push({ x: new Date(i.date), y: i.n + result[result.length - 1].y });
        }
    }
    return result;
}

export async function getActiveUsersDayByDay() {
    let query = "SELECT d, count(*) AS n, MIN(date) as date FROM (SELECT date, enrollment_id, date/86400000 as d FROM hits where enrollment_id IS NOT NULL AND enrollment_id != '' group by d, enrollment_id) GROUP BY d ORDER BY d;";
    let db_result = await runQuery(query, []);
    let result = []
    for (const i of db_result) {
        result.push({ x: new Date(i.date), y: i.n });
    }
    return result;
}

export async function getActiveUsers(date) {
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    date = (date.getTime() / 86400000).toFixed(0).toString();
    let query = "SELECT COUNT(*) as users FROM (SELECT DISTINCT enrollment_id FROM hits WHERE date/86400000 = " + date + ");";
    let results = await runQuery(query, []);
    return results[0].users;
}

export async function getNumUsersForCourses() {
    let query = "SELECT course AS x, COUNT(*) as y FROM enrollments GROUP BY course ORDER BY y DESC LIMIT 20;";
    let results = await runQuery(query, []);
    let data = { x: [], y: [] };
    for (const row of results) {
        data.x.push(row.x);
        data.y.push(row.y);
    }
    return data;
}

export async function getTotalEnrollments() {
    let query = "SELECT COUNT(*) as users FROM enrollments;";
    let result = await runQuery(query, []);
    return result[0].users;
}

export async function getActiveEnrollments() {
    let query = "SELECT enrollment_id, enrollments.course AS course, counter FROM (SELECT enrollment_id, count(*) AS counter FROM hits GROUP BY enrollment_id) INNER JOIN enrollments ON enrollment_id=enrollments.id WHERE counter > 1 ORDER BY counter DESC;"
    let results = await runQuery(query, []);
    return results;
}

export async function getDeviceStats() {
    try {
        let query = `
            SELECT 
                CASE 
                    WHEN SUBSTR(user_agent, 1, INSTR(user_agent || '/', '/') - 1) LIKE 'Google%' 
                    THEN 'Google'
                    ELSE SUBSTR(user_agent, 1, INSTR(user_agent || '/', '/') - 1)
                END AS truncated_user_agent,
                COUNT(DISTINCT enrollment_id || '|' || CASE 
                    WHEN SUBSTR(user_agent, 1, INSTR(user_agent || '/', '/') - 1) LIKE 'Google%' 
                    THEN 'Google'
                    ELSE SUBSTR(user_agent, 1, INSTR(user_agent || '/', '/') - 1)
                END) as count
            FROM hits 
            WHERE user_agent IS NOT NULL AND user_agent != '' AND enrollment_id IS NOT NULL AND enrollment_id != ''
            GROUP BY truncated_user_agent
            ORDER BY count DESC
        `;
        let results = await runQuery(query, []);        
        let data = { x: [], y: [] };
        
        // Show only top 6 devices, group the rest as "Others"
        const topDevices = results.slice(0, 6);
        const otherDevices = results.slice(6);
        
        // Add top devices
        for (const row of topDevices) {
            data.x.push(row.truncated_user_agent);
            data.y.push(row.count);
        }
        
        // Add "Others" if there are remaining devices
        if (otherDevices.length > 0) {
            const othersCount = otherDevices.reduce((sum, row) => sum + row.count, 0);
            data.x.push('Altri');
            data.y.push(othersCount);
        }
        
        return data;
    } catch (error) {
        console.error('Error in getDeviceStats:', error);
        return { x: [], y: [] };
    }
}
