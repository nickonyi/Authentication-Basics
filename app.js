import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const app = express();

const __fileName = fileURLToPath(import.meta.url);
const __dirName = path.dirname(__fileName);

app.set("views", path.join(__dirName, "views"));
app.set("view engine", "ejs");

app.use(session({ secret: "cats", resave: false, saveUninitialized: false }));
app.use(passport.session());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => res.render("index"));
app.get("/sign-up", (req, res) => res.render("sign-up-form"));
app.post("/sign-up", async (req, res, next) => {
  try {
    await pool.query(
      `
            INSERT into users (username,password) VALUES ($1,$2)
            `,
      [req.body.username, req.body.password],
    );
    res.redirect("/");
  } catch (error) {
    next(error);
  }
});

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM users WHERE username=$1`,
        [username],
      );
      const user = rows[0];

      if (!user) {
        return done(null, false, { message: "incorrect username" });
      }

      if (user.password !== password) {
        return done(null, false, { message: "incorrectd password!" });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id=$1", [id]);
    const user = rows[0];
    done(null, user);
  } catch (err) {
    done(err);
  }
});

app.listen(3000, (err) => {
  if (err) {
    throw err;
  }
  console.log("App running on port 3000!");
});
