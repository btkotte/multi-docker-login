const express = require("express");
const exphbs = require("express-handlebars");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");

const app = express();

const crypto = require("crypto");
//Generate a random Id for the server
const serverId = crypto.randomBytes(5).toString('hex');

const env = require("./env");
const mysql = require("mysql");
// create connection object for the database
const db = mysql.createConnection({
  host: env.msHost,
  user: env.msUser,
  password: env.msPassword,
  database: env.msDatabase,
});

// connect to database
db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log("Connected to database");

  var createTableQuery =
    "CREATE TABLE IF NOT EXISTS login(" +
    "email VARCHAR (100) PRIMARY KEY," +
    "firstName VARCHAR (50) NOT NULL," +
    "lastName VARCHAR (50) NOT NULL," +
    "password VARCHAR (100) NOT NULL)";

  db.query(createTableQuery, (err, result) => {
    if (err) throw err;
    console.log("Table created");
  });
});

const getHashedPassword = (password) => {
  const sha256 = crypto.createHash("sha256");
  const hash = sha256.update(password).digest("base64");
  return hash;
};

// to support URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser());

// Read cookie before redirection
app.use((req, res, next) => {
  req.user = req.cookies["AuthUser"];
  next();
});

app.engine(
  "hbs",
  exphbs({
    extname: ".hbs",
  })
);

app.set("view engine", "hbs");

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = getHashedPassword(password);

  var findUserQuery = "SELECT * from login where email=? AND password=?";

  db.query(findUserQuery, [email, hashedPassword], (err, results) => {
    if (err) throw err;
    if (results.length > 0) {
        console.log
      const user = results[0];
      //authUsers[email] = user.firstName + " " + user.lastName;
      res.cookie("AuthUser", user.firstName + " " + user.lastName);
      res.redirect("/profile");
      return;
    } else {
      res.render("login", {
        message: "Invalid username or password",
        messageClass: "alert-danger",
      });
    }
  });
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  const { email, firstName, lastName, password, confirmPassword } = req.body;

  if (password === confirmPassword) {
    //Check if a user with same email exists in DB
    var findUserQuery = "SELECT * from login where email=?";
    db.query(findUserQuery, [email], (err, results) => {
      if (err) throw err;
      if (results.length > 0) {
        res.render("register", {
          message: "User already registered.",
          messageClass: "alert-danger",
        });
        return;
      } else {
        //Create hashed password and save the user data to DB
        const hashedPassword = getHashedPassword(password);
        var insertUserQuery =
          "INSERT INTO login(email, firstName, lastName, password) VALUES (?,?,?,?)";
        db.query(
          insertUserQuery,
          [email, firstName, lastName, hashedPassword],
          (err, result) => {
            if (err) throw err;
            res.render("login", {
              message: "Registration Complete. Please login to continue.",
              messageClass: "alert-success",
            });
          }
        );
      }
    });
  } else {
    res.render("register", {
      message: "Password does not match.",
      messageClass: "alert-danger",
    });
  }
});

app.get("/profile", (req, res) => {
  if (req.user) {
    res.render("profile", {
      message: "Welcome " + req.user + ". Request reached server: " + serverId,
      messageClass: "alert-info",
    });
  } else {
    res.render("login", {
      message: "Please login to continue",
      messageClass: "alert-danger",
    });
  }
});

app.get("/logout", (req, res) => {
  if (req.user) {
    res.clearCookie("AuthUser");
    res.render("login", {
      message: "Succesfully logged out",
      messageClass: "alert-danger",
    });
  } else {
    res.render("login", {
      message: "Please login to continue",
      messageClass: "alert-danger",
    });
  }
});

app.listen(9999, () => {
  console.log("LoginApp started on port 9999");
});