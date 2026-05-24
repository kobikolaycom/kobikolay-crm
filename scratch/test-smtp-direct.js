const nodemailer = require("nodemailer");

async function test() {
  console.log("Testing SMTP connection with new app password...");
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: "turizm.onurhan@gmail.com",
      pass: "mxwj ombr zvsi tyyk",
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    await transporter.verify();
    console.log("SUCCESS! Connection verified.");
  } catch (error) {
    console.error("FAILED!", error.message);
  }
}

test();
