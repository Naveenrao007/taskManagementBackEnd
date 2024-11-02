const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jsonwebtoken = require("jsonwebtoken");
const mongoose = require("mongoose")
const authMiddleware = require("../middleware/Auth");
const { getUserIdByEmail } = require("../utils/index");
const User = require('../schema/user.shcema')
const Dashboard = require('../schema/dashboard.schema')
router.get("/board", authMiddleware, async (req, res) => {
    try {
        const createdByUserId = (await getUserIdByEmail(req.user)).toString();
        const user = await User.findById(createdByUserId);
        const userName = user ? user.name : "Unknown User";

        const userDashboard = await Dashboard.findOne({ createdBy: new mongoose.Types.ObjectId(createdByUserId) });

        const combinedDashboard = {
            Todo: [],
            InProgress: [],
            Backlog: [],
            Done: []
        };

        const uniqueTaskIds = new Set();

        const mergeDashboards = (dashboard) => {
            if (dashboard) {
                const pushUniqueTasks = (taskArray) => {
                    taskArray.forEach(task => {
                        if (!uniqueTaskIds.has(task._id.toString())) {
                            uniqueTaskIds.add(task._id.toString());
                            combinedDashboard[taskArray.name].push(task);
                        }
                    });
                };

                if (dashboard.Backlog) {
                    dashboard.Backlog.name = 'Backlog';
                    pushUniqueTasks(dashboard.Backlog);
                }
                if (dashboard.Todo) {
                    dashboard.Todo.name = 'Todo';
                    pushUniqueTasks(dashboard.Todo);
                }
                if (dashboard.Inprogress) {
                    dashboard.Inprogress.name = 'InProgress';
                    pushUniqueTasks(dashboard.Inprogress);
                }
                if (dashboard.Done) {
                    dashboard.Done.name = 'Done';
                    pushUniqueTasks(dashboard.Done);
                }
            }
        };

        if (userDashboard) {
            mergeDashboards(userDashboard);
        }

        const assignedDashboards = await Dashboard.find({ Access: createdByUserId });

        assignedDashboards.forEach(assignedDashboard => {
            mergeDashboards(assignedDashboard);
        });

        if (
            combinedDashboard.Todo.length === 0 &&
            combinedDashboard.InProgress.length === 0 &&
            combinedDashboard.Backlog.length === 0 &&
            combinedDashboard.Done.length === 0
        ) {
            return res.status(200).json({
                message: "No dashboards found for this user",
                data: {
                    dashboard: {},
                    userName,
                    email: req.user

                }
            });
        }

        res.status(200).json({
            message: "Data fetched successfully",
            data: {
                dashboard: combinedDashboard,
                userName,
                email: req.user
            }
        });
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({ message: "Internal Server error" });
    }
});


router.post("/create", authMiddleware, async (req, res) => {
    const { title, priority, assignTo, dueDate, checklist } = req.body;
    
    const createdByUserId = (await getUserIdByEmail(req.user)).toString();
    const user = await User.findById(createdByUserId).select('name');
    const userName = user ? user.name : "Unknown User";
    if (!title) {
        return res.status(400).json({ message: "Missing title field" });
    }
    if (!priority) {
        return res.status(400).json({ message: "Missing priority field" });
    }

    let userId = null;
    if (assignTo) {
        try {
            userId = await getUserIdByEmail(assignTo);
        } catch (error) {
            console.error("Error fetching user ID:", error);
            return res.status(500).json({ message: "Error fetching user ID" });
        }
    }

    const formattedCheckList = (checklist || []).map((item, index) => ({
        id: item.id || index + 1,
        title: item.text,
        completed: item.completed || false,
    }));

    try {
        const newCard = {
            title,
            priority,
            assignTo: userId ? new mongoose.Types.ObjectId(userId) : null,
            date: dueDate,
            checkList: formattedCheckList,
            createdBy: createdByUserId
        };

        let dashboard = await Dashboard.findOne({ createdBy: createdByUserId });

        if (!dashboard) {
            dashboard = new Dashboard({ createdBy: createdByUserId, Access: [createdByUserId] });
        }

        dashboard.Todo.push(newCard);
        await dashboard.save();

        res.status(201).json({
            message: "Card added to Todo", data: {
                dashboard,
                userName,
                email: req.user


            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server error" });
    }
});

router.put("/updateTaskStatus", authMiddleware, async (req, res) => {
    const { taskId, fromArray, toArray } = req.body;

    try {
        const createdByUserId = (await getUserIdByEmail(req.user)).toString();
        const user = await User.findById(createdByUserId).select('name');
        const userName = user ? user.name : "Unknown User";

        const dashboards = await Dashboard.find({ createdBy: createdByUserId });


        let taskFound = false;

        for (const dashboard of dashboards) {
            const taskIndex = dashboard[fromArray].findIndex(task => task._id.toString() === taskId);
            if (taskIndex !== -1) {
                const task = dashboard[fromArray][taskIndex];

                dashboard[fromArray].splice(taskIndex, 1);
                dashboard[toArray].push(task);

                await dashboard.save();

                taskFound = true;
                return res.status(200).json({
                    message: "Task status updated successfully", data: {
                        dashboard, userName, email: req.user
                    }
                });
            }
        }
        if (!taskFound) {
            return res.status(404).json({ message: "Task not found in any dashboard" });
        }
    } catch (error) {
        console.error("Error updating task status:", error);
        res.status(500).json({ message: "Internal Server error" });
    }
});

router.put("/UpdateTask", authMiddleware, async (req, res) => {
    const { taskId, fromArray, taskData, dueDate } = req.body;

    try {
        const createdByUserId = (await getUserIdByEmail(req.user)).toString();
        const user = await User.findById(createdByUserId).select('name');
        const userName = user ? user.name : "Unknown User";


        const dashboards = await Dashboard.find({ createdBy: createdByUserId });

        let taskUpdated = false;

        for (const dashboard of dashboards) {
            const taskIndex = dashboard[fromArray].findIndex(task => task._id.toString() === taskId);
            if (taskIndex !== -1) {
                const task = dashboard[fromArray][taskIndex];
                task.title = taskData.title;
                task.priority = taskData.priority;
                task.date = taskData.dueDate;
                task.checkList = taskData.checkList;

                await dashboard.save();
                taskUpdated = true;

                return res.status(200).json({
                    message: "Task updated successfully", data: {
                        dashboard, userName,
                        email: req.user
                    }
                });
            }
        }


        if (!taskUpdated) {
            return res.status(404).json({ message: "Task not found in any dashboard" });
        }
    } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


router.delete("/deleteTask", authMiddleware, async (req, res) => {
    const { taskId, fromArray } = req.body;

    try {
        const createdByUserId = (await getUserIdByEmail(req.user)).toString();
        const user = await User.findById(createdByUserId).select('name');
        const userName = user ? user.name : "Unknown User";


        const dashboards = await Dashboard.find({ createdBy: createdByUserId });

        let taskDeleted = false;


        for (const dashboard of dashboards) {
            const taskIndex = dashboard[fromArray].findIndex(task => task._id.toString() === taskId);
            if (taskIndex !== -1) {
                dashboard[fromArray].splice(taskIndex, 1);
                await dashboard.save();
                taskDeleted = true;

                return res.status(200).json({ message: "Task deleted successfully", data: { dashboard, userName } });
            }
        }


        if (!taskDeleted) {
            return res.status(404).json({ message: "Task not found in any dashboard" });
        }
    } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

router.get("/getTask", async (req, res) => {
    const { taskId, fromArray } = req.query
    try {
        const dashboards = await Dashboard.find();

        let foundTask = null;

        for (const dashboard of dashboards) {
            if (dashboard[fromArray]) {
                const task = dashboard[fromArray].find(task => task._id.toString() === taskId);
                if (task) {
                    foundTask = task;
                    break;
                }
            } else {
                console.warn(`Array ${fromArray} not found in dashboard ID: ${dashboard._id}`);
            }
        }

        if (foundTask) {
            return res.status(200).json({ message: "Task retrieved successfully", data: foundTask });
        } else {
            return res.status(404).json({ message: "Task not found in any dashboard" });
        }
    } catch (error) {
        console.error("Error retrieving task:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }

});
router.get('/analytics', authMiddleware, async (req, res) => {
    try {
        const createdByUserId = (await getUserIdByEmail(req.user)).toString();
        const combinedDashboard = {
            Backlog: [],
            Todo: [],
            Inprogress: [],
            Done: []
        };
    
        const mergeDashboards = (dashboard) => {
            if (dashboard) {
                combinedDashboard.Backlog.push(...(dashboard.Backlog || []));
                combinedDashboard.Todo.push(...(dashboard.Todo || []));
                combinedDashboard.Inprogress.push(...(dashboard.Inprogress || []));
                combinedDashboard.Done.push(...(dashboard.Done || []));
            }
        };
    
        const userDashboard = await Dashboard.findOne({ createdBy: new mongoose.Types.ObjectId(createdByUserId) });
        mergeDashboards(userDashboard);
    
        const assignedDashboards = await Dashboard.find({ Access: createdByUserId });
        assignedDashboards.forEach(assignedDashboard => {
            mergeDashboards(assignedDashboard);
        });
    
        const removeDuplicates = (tasks) => {
            const uniqueTasks = new Map();
            tasks.forEach(task => {
                uniqueTasks.set(task._id.toString(), task);
            });
            return Array.from(uniqueTasks.values());
        };
    
        combinedDashboard.Backlog = removeDuplicates(combinedDashboard.Backlog);
        combinedDashboard.Todo = removeDuplicates(combinedDashboard.Todo);
        combinedDashboard.Inprogress = removeDuplicates(combinedDashboard.Inprogress);
        combinedDashboard.Done = removeDuplicates(combinedDashboard.Done);
    
        const analytics = {
            totalBacklogTasks: combinedDashboard.Backlog.length,
            totalTodoTasks: combinedDashboard.Todo.length,
            totalInprogressTasks: combinedDashboard.Inprogress.length,
            totalDoneTasks: combinedDashboard.Done.length,
            lowPriorityTasks: 0,
            moderatePriorityTasks: 0,
            highPriorityTasks: 0,
            pastDueTasks: 0 
        };
    
        const countTaskProperties = (tasks) => {
            const currentDate = new Date();
            tasks.forEach(task => {
                if (task.priority === 'low') {
                    analytics.lowPriorityTasks++;
                } else if (task.priority === 'mid') {
                    analytics.moderatePriorityTasks++;
                } else if (task.priority === 'high') {
                    analytics.highPriorityTasks++;
                }
    
                if (task.date && task.date < currentDate) {
                    analytics.pastDueTasks++;
                }
            });
        };
    
        countTaskProperties(combinedDashboard.Backlog);
        countTaskProperties(combinedDashboard.Todo);
        countTaskProperties(combinedDashboard.Inprogress);
        countTaskProperties(combinedDashboard.Done);
    
        res.status(200).json({
            message: "Data fetched successfully",
            data: analytics
        });
    } catch (error) {
        console.error("Error fetching analytics data:", error);
        res.status(500).json({ message: "Internal Server error" });
    }
    

})


router.post("/adduser", authMiddleware, async (req, res) => {
    const { email } = req.body;

    try {
        const createdByUserId = await getUserIdByEmail(req.user);
        if (!createdByUserId) {
            return res.status(404).json({ message: "Creator user not found" });
        }

        const dashboard = await Dashboard.findOne({ createdBy: new mongoose.Types.ObjectId(createdByUserId) });
        if (!dashboard) {
            return res.status(404).json({ message: "Dashboard not found" });
        }

        const addUserId = await getUserIdByEmail(email);
        if (!addUserId) {
            return res.status(404).json({ message: "User not found with the provided email" });
        }

        const addUserIdObject = new mongoose.Types.ObjectId(addUserId);

        if (dashboard.Access.some(id => id.equals(addUserIdObject))) {
            return res.status(409).json({ message: "User already has access to the dashboard" });
        }

        dashboard.Access.push(addUserIdObject);
        await dashboard.save();

        res.status(200).json({ message: "Email added to dashboard access successfully", email });
    } catch (error) {
        console.error("Error adding email to dashboard access:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }

});



module.exports = router;


