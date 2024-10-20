const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const userRouter = require('./routes/user');
const cors = require('cors')
const dotenv = require('dotenv');
dotenv.config();
const app = express();
app.use(cors())
const PORT = process.env.PORT_STRING || 3000;
const MONGODB_URI = process.env.MONGODB_URI
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/user/", userRouter);
const connectDatabase = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Database connected successfully!");
        app.listen(PORT, () => {
            console.log(`Server is Up and running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Database connection failed:", error);
        setTimeout(connectDatabase, 5000);
    }
};
connectDatabase();


