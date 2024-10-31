const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jsonwebtoken = require("jsonwebtoken");
const mongoose = require("mongoose")
const authMiddleware = require("../middleware/Auth");
const { getUserIdByEmail } = require("../utils");
const User = require('../schema/user.shcema')
const Dashboard = require('../schema/dashboard.schema')
router.get("/board", authMiddleware, async (req, res) => {
    try {
        const createdByUserId = (await getUserIdByEmail(req.user)).toString();
        const user = await User.findById(createdByUserId).select('name');
        const userName = user ? user.name : "Unknown User";
        const dashboard = await Dashboard.findOne({ createdBy: new mongoose.Types.ObjectId(createdByUserId) }).lean();

        if (!dashboard) {
            return res.status(200).json({
                message: "No dashboard found for this user",
                data: {
                    dashboard: {},
                    userName
                }
            });
        }

        res.status(200).json({
            message: "Data fetched successfully",
            data: {
                dashboard,
                userName
            }
        });
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({ message: "Internal Server error" });
    }
});


router.post("/create", authMiddleware, async (req, res) => {
    const { title, priority, assignTo, date, checklist } = req.body;


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
            console.log("User ID:", userId);
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
            date,
            checkList: formattedCheckList,
            createdBy: createdByUserId
        };

        let dashboard = await Dashboard.findOne({ createdBy: createdByUserId });

        if (!dashboard) {
            dashboard = new Dashboard({ createdBy: createdByUserId, Access: [createdByUserId] });
        }

        dashboard.Todo.push(newCard);
        await dashboard.save();

        res.status(201).json({ message: "Card added to Todo", card: newCard });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server error" });
    }
});


router.put("/updateTaskStatus", authMiddleware, async (req, res) => {
    const { dashboardId, taskId, fromArray, toArray } = req.body;

    try {
        const dashboard = await Dashboard.findById(dashboardId);
        if (!dashboard) {
            return res.status(404).json({ message: "Dashboard not found" });
        }

        const taskIndex = dashboard[fromArray].findIndex(task => task._id.toString() === taskId);
        if (taskIndex === -1) {
            return res.status(404).json({ message: "Task not found" });
        }

        const task = dashboard[fromArray][taskIndex];
        console.log(task)
        dashboard[fromArray].splice(taskIndex, 1);
        dashboard[toArray].push(task);

        await dashboard.save();

        res.status(200).json({ message: "Task status updated successfully", data: { dashboard } });
    } catch (error) {
        console.error("Error updating task status:", error);
        res.status(500).json({ message: "Internal Server error" });
    }
});

router.put("/UpdateTask", authMiddleware, async (req, res) => {
    const { dashboardId, taskId, fromArray, taskData } = req.body; 
    console.log("req.body", { dashboardId, taskId, fromArray, taskData });
    
    try {   
        const dashboard = await Dashboard.findById(dashboardId);
        if (!dashboard) {
            return res.status(404).json({ message: "Dashboard not found" });
        }

        const taskIndex = dashboard[fromArray].findIndex(task => task._id.toString() === taskId);
        if (taskIndex === -1) {
            return res.status(404).json({ message: "Task not found" });
        }

        const task = dashboard[fromArray][taskIndex];
        task.title = taskData.title;
        task.priority = taskData.priority;
        task.checkList = taskData.checkList; 

        await dashboard.save();

        res.status(200).json({ message: "Task updated successfully", data: { dashboard } });
    } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

router.delete("/deleteTask", authMiddleware, async (req, res) => {
    console.log(req.body)
    const { dashboardId, taskId, fromArray } = req.body;

    try {
        const dashboard = await Dashboard.findById(dashboardId);
        const createdByUserId = (await getUserIdByEmail(req.user)).toString();
        const user = await User.findById(createdByUserId).select('name');
        const userName = user ? user.name : "Unknown User";
        if (!dashboard) {
            return res.status(404).json({ message: "Dashboard not found" });
        }

        const taskIndex = dashboard[fromArray].findIndex(task => task._id.toString() === taskId);
        if (taskIndex === -1) {
            return res.status(404).json({ message: "Task not found" });
        }
        dashboard[fromArray].splice(taskIndex, 1);
        await dashboard.save();
        res.status(200).json({ message: "Task deleted successfully", data: { dashboard ,userName} });
    } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }

});



module.exports = router;


