import nodemailer from "nodemailer"

const transport = nodemailer.createTransport({
    // host: "mail.ticketsque.com", //incorrect config
    // service: "Outlook365",
    host: "smtpout.secureserver.net",
    port: 465,
    secure: true,
    auth: {
        //production credentials
        user: "noreply@ticketsque.info",
        pass: "NoReplay@TicketsQue11"
    },
})

const sendEmail = async (reciverEmail, emailBody) => {
    const info = await transport.sendMail({
        from: "Tickets Que<noreply@ticketsque.info>",
        to: reciverEmail,
        subject: `Welcome to ${emailBody?.vendor_name}`,
        html: `<h3>hello ${emailBody?.name},</h3>
        <h4>You have been added as ${emailBody?.role?.toUpperCase()} by ${emailBody?.vendor_name?.toUpperCase()}</h4>
        <h4>you can login to dashboard at https://www.eventhost.ticketsque.com</h4>
        <h4><b>Use the following mobile number ${emailBody?.username} to login to the dashboard. </b></h4>
        <h4>Thank you.</h4>`
    })
}

export default sendEmail