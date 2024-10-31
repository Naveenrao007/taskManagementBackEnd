 const mongoose = require("mongoose");
const DashboardSchema = new mongoose.Schema({
   createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
   Access: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
   Backlog: [
      {
         title: { type: String, required: true },
         priority: { type: String, required: true },
         assignTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
         checkList: [
            {
               id: { type: Number, required: true },
               title: { type: String, required: true },
               completed: { type: Boolean, default: false }
            }
         ],
         date: {
            type: Date,
         },
         status: {
            type: String,
            enum: ['Todo', 'Inprogress', 'Done'],
         },

      }
   ],
   Todo: [
      {
         title: { type: String, required: true },
         priority: { type: String, required: true },
         assignTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
         checkList: [
            {
               id: { type: Number, required: true },
               title: { type: String, required: true },
               completed: { type: Boolean, default: false }
            }
         ],
         date: {
            type: Date,
         },
         status: {
            type: String,
            enum: ['Backlog', 'Inprogress', 'Done'],
         }

      }
   ],
   Inprogress: [
      {
         title: { type: String, required: true },
         priority: { type: String, required: true },
         assignTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
         checkList: [
            {
               id: { type: Number, required: true },
               title: { type: String, required: true },
               completed: { type: Boolean, default: false }
            }
         ],
         date: {
            type: Date,
         
         },
         status: {
            type: String,
            enum: ['Todo', 'Backlog', 'Done'],
         },

      }
   ],
   Done: [
      {
         title: { type: String, required: true },
         priority: { type: String, required: true },
         assignTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
         checkList: [
            {
               id: { type: Number, required: true },
               title: { type: String, required: true },
               completed: { type: Boolean, default: false }
            }
         ],
         date: {
            type: Date,
         },
         status: {
            type: String,
            enum: ['Todo', 'Inprogress', 'Backlog'],
         },

      }
   ],
});

module.exports = mongoose.model('Dashboard', DashboardSchema);
