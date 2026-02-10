import bcrypt from "bcryptjs";

const password = "Docvault123"; // your actual password
const saltRounds = 10;

const hashPassword = async () => {
  const hashed = await bcrypt.hash(password, saltRounds);
  console.log("Hashed password:", hashed);
};

hashPassword();