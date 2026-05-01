
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
import { adminRouter } from "./Routes/AdminRoute.js";
const app = express();
import { EmployeeRouter } from "./Routes/EmployeeRoute.js";
app.use(cors({
    origin:['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods:['GET','POST','PUT','DELETE'],
    credentials:true
}))
app.use(cookieParser());
app.use(express.json())
app.use('/auth',adminRouter)
app.use("/employee", EmployeeRouter);

app.use(express.static('public'))
const verifyUser = (req, res, next) => {
  const token = req.cookies.token;
  if (token) {
jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.json({ Status: false, Error: "Wrong Token" });

   
      req.id = decoded.id;
      req.role = decoded.role;
      next();
    });
  } else {
    return res.json({ Status: false, Error: "Not authenticated" });
  }
};

app.get("/verify", verifyUser, (req, res) => {
  return res.json({ Status: true, role: req.role, id: req.id });
});
app.listen(3000, () => {
    console.log('The server is done ');
  
});

