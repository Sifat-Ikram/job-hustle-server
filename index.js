const express = require("express");
const cors = require("cors");
const app = express();
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 4321;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173','https://job-hustle.web.app','https://job-hustle.firebaseapp.com'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const logger =(req, res, next)=>{
  console.log('log: info', req.method, req.url);
  next();
}

const verifyToken = (req, res, next)=>{
  const token = req?.cookies?.token;
  console.log('verify token', token);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
    if(err){
      return res.status(401).send({message: 'Access denied'});
    }
    req.user = decoded;
    next();
  })
}




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jrqljyn.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const jobCollection = client.db('jobDB').collection('allJobs');

    app.post('/jwt', async(req, res)=>{
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});
      res
      .cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production'? 'none' : 'strict'
      })
      .send({message: 'succeed', token});
    })

    app.post('/logOut', async(req, res)=>{
      const user = req.body;
      console.log('logging out', user);
      res.clearCookie('token', {maxAge: 0}).send({success: true})
    })

    app.post('/allJobs', async (req, res) => {
      const newJob = req.body;
      console.log(newJob);
      const result = await jobCollection.insertOne(newJob);
      res.send(result);
    })

    app.get('/allJobs', async (req, res) => {
      const cursor = jobCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.delete('/myJob/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await jobCollection.deleteOne(query);
      res.send(result);
    })

    app.get('/myJob', logger, verifyToken, async (req, res) => {
      console.log(req.query.email);
      console.log( 'token owner', req.user);
      if(req.user.email !== req.query.email){
        return res.status(403).send({message: 'Access forbidden'});
      }
      let query = {};
      if(req.query?.email){
        query = { email: req.query.email }
        }
      const result = await jobCollection.find(query).toArray();
      res.send(result);
    })

    app.put('/allJobs/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedJob = req.body;
      const job = {
        $set: {
          username: updatedJob.username,
          title: updatedJob.title,
          work_type: updatedJob.work_type,
          salary_range: updatedJob.salary_range,
          posting_date: updatedJob.posting_date,
          deadline: updatedJob.deadline,
          applicant_number: updatedJob.applicant_number,
          photo: updatedJob.photo,
          description: updatedJob.description
        }
      }
      const result = await jobCollection.updateOne(filter, job, options);
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('job hustle website is running');
})

app.listen(port, () => {
  console.log(`job hustle server is running on port: ${port}`);
});