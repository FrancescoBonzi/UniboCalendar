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
    // Use the pre-computed day column for better performance
    let query = "SELECT COUNT(*) AS n, day, MIN(date) as date FROM hits GROUP BY day ORDER BY day;";
    let db_result = await runQuery(query, []);
    let result = [];
    for (const i of db_result) {
        result.push({ x: new Date(i.date), y: i.n });
    }
    return result;
}

export async function getNumEnrollmentsDayByDay() {
    // Use the pre-computed day column for better performance
    let query = "SELECT COUNT(*) AS n, day, MIN(date) as date FROM enrollments GROUP BY day ORDER BY day;";
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
    // Optimized query using pre-computed day column and better indexing
    let query = `
        SELECT day as d, COUNT(DISTINCT enrollment_id) AS n, MIN(date) as date 
        FROM hits 
        WHERE enrollment_id IS NOT NULL AND enrollment_id != '' 
        GROUP BY day 
        ORDER BY day
    `;
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
    const day = Math.floor(date.getTime() / 86400000);
    
    // Use pre-computed day column and parameterized query for better performance
    let query = "SELECT COUNT(DISTINCT enrollment_id) as users FROM hits WHERE day = ? AND enrollment_id IS NOT NULL AND enrollment_id != '';";
    let results = await runQuery(query, [day]);
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
    // Optimized query using better indexing
    let query = `
        SELECT enrollment_id, enrollments.course AS course, counter 
        FROM (
            SELECT enrollment_id, COUNT(*) AS counter 
            FROM hits 
            WHERE enrollment_id IS NOT NULL AND enrollment_id != ''
            GROUP BY enrollment_id
        ) hit_counts
        INNER JOIN enrollments ON hit_counts.enrollment_id = enrollments.id 
        WHERE counter > 1 
        ORDER BY counter DESC
    `;
    let results = await runQuery(query, []);
    return results;
}

export async function getDeviceStats() {
    try {
        // Pre-compute user agent parsing to avoid repeated string operations
        // First, let's get a sample of user agents to understand the patterns
        let sampleQuery = `
            SELECT DISTINCT user_agent 
            FROM hits 
            WHERE user_agent IS NOT NULL AND user_agent != '' 
            AND enrollment_id IS NOT NULL AND enrollment_id != ''
            LIMIT 1000
        `;
        let samples = await runQuery(sampleQuery, []);
        
        // Create a mapping of common user agents to their simplified names
        let userAgentMap = new Map();
        for (let sample of samples) {
            let ua = sample.user_agent;
            let simplified = ua.split('/')[0].trim();
            if (simplified.toLowerCase().includes('google')) {
                simplified = 'Google';
            }
            userAgentMap.set(ua, simplified);
        }
        
        // Now use a more efficient query with CASE statements
        let query = `
            SELECT 
                CASE 
                    WHEN user_agent LIKE 'Google%' THEN 'Google'
                    WHEN user_agent LIKE 'Mozilla%' THEN 'Mozilla'
                    WHEN user_agent LIKE 'Apple%' THEN 'Apple'
                    WHEN user_agent LIKE 'Microsoft%' THEN 'Microsoft'
                    WHEN user_agent LIKE 'Opera%' THEN 'Opera'
                    WHEN user_agent LIKE 'Safari%' THEN 'Safari'
                    WHEN user_agent LIKE 'Chrome%' THEN 'Chrome'
                    WHEN user_agent LIKE 'Firefox%' THEN 'Firefox'
                    ELSE SUBSTR(user_agent, 1, INSTR(user_agent || '/', '/') - 1)
                END AS device_type,
                COUNT(DISTINCT enrollment_id) as count
            FROM hits 
            WHERE user_agent IS NOT NULL AND user_agent != '' 
            AND enrollment_id IS NOT NULL AND enrollment_id != ''
            GROUP BY device_type
            ORDER BY count DESC
        `;
        
        let results = await runQuery(query, []);        
        let data = { x: [], y: [] };
        
        // Show only top 6 devices, group the rest as "Others"
        const topDevices = results.slice(0, 6);
        const otherDevices = results.slice(6);
        
        // Add top devices
        for (const row of topDevices) {
            data.x.push(row.device_type);
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
