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
        console.log("User ID:", createdByUserId);

        // Fetch user name first to ensure it’s available in both cases
        const user = await User.findById(createdByUserId).select('name');
        const userName = user ? user.name : "Unknown User";

        // Find dashboard data if it exists
        const dashboard = await Dashboard.findOne({ createdBy: new mongoose.Types.ObjectId(createdByUserId) }).lean();

        // Return response based on whether dashboard exists or not
        if (!dashboard) {
            return res.status(200).json({
                message: "No dashboard found for this user",
                data: {
                    dashboard: {}, // Send empty object when no dashboard is found
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
    const { title, priority, assignTo, date ,checklist } = req.body;
 
    console.log(checklist);
    
    const createdByUserId = await getUserIdByEmail(req.user);
    console.log(createdByUserId);
  
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

module.exports = router;


