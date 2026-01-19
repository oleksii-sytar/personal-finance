/**
 * Email service for sending workspace invitations
 * This is a basic implementation that can be extended with actual email providers
 */

interface InvitationEmailData {
  to: string
  workspaceName: string
  inviterName: string
  invitationToken: string
}

/**
 * Generate invitation email content
 */
export function generateInvitationEmail(data: InvitationEmailData) {
  const invitationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/invite?token=${data.invitationToken}`
  
  const subject = `You're invited to join ${data.workspaceName} on Forma`
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Workspace Invitation</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #E6A65D 0%, #F4B76D 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #E6A65D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>You're Invited to Forma!</h1>
        </div>
        <div class="content">
          <p>Hi there!</p>
          <p><strong>${data.inviterName}</strong> has invited you to join the <strong>${data.workspaceName}</strong> workspace on Forma.</p>
          <p>Forma helps families manage their finances together with shared workspaces, transaction tracking, and collaborative budgeting.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" class="button">Accept Invitation</a>
          </p>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px; font-family: monospace;">
            ${invitationUrl}
          </p>
          <p><small>This invitation will expire in 7 days.</small></p>
        </div>
        <div class="footer">
          <p>This invitation was sent by ${data.inviterName} through Forma.</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  const textContent = `
You're invited to join ${data.workspaceName} on Forma!

${data.inviterName} has invited you to join the ${data.workspaceName} workspace on Forma.

Forma helps families manage their finances together with shared workspaces, transaction tracking, and collaborative budgeting.

To accept this invitation, click the link below or copy and paste it into your browser:
${invitationUrl}

This invitation will expire in 7 days.

This invitation was sent by ${data.inviterName} through Forma.
  `
  
  return {
    subject,
    html: htmlContent,
    text: textContent,
    invitationUrl
  }
}

/**
 * Send invitation email (placeholder implementation)
 * In production, this would integrate with an email service like Resend, SendGrid, etc.
 */
export async function sendInvitationEmail(data: InvitationEmailData): Promise<{
  success: boolean
  error?: string
  emailContent?: ReturnType<typeof generateInvitationEmail>
}> {
  try {
    const emailContent = generateInvitationEmail(data)
    
    // For development, just log the email content
    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        emailContent
      }
    }
    
    // TODO: Implement actual email sending with your preferred service
    // Example with Resend (uncomment when ready):
    /*
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      
      const result = await resend.emails.send({
        from: 'Forma <invitations@forma.app>',
        to: data.to,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      })
      
      if (result.error) {
        console.error('Resend error:', result.error)
        return {
          success: false,
          error: 'Failed to send email via Resend'
        }
      }
      
      console.log('Email sent successfully via Resend:', result.data?.id)
      return { success: true, emailContent }
    }
    */
    
    // Example with SendGrid (uncomment when ready):
    /*
    if (process.env.SENDGRID_API_KEY) {
      const sgMail = await import('@sendgrid/mail')
      sgMail.setApiKey(process.env.SENDGRID_API_KEY)
      
      const msg = {
        to: data.to,
        from: 'invitations@forma.app',
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      }
      
      await sgMail.send(msg)
      console.log('Email sent successfully via SendGrid')
      return { success: true, emailContent }
    }
    */
    
    // Fallback: Log email content (production fallback)
    console.warn('No email service configured, logging email content')
    
    return {
      success: true,
      emailContent,
      error: 'Email service not configured - invitation created but email not sent'
    }
  } catch (error) {
    console.error('Error sending invitation email:', error)
    return {
      success: false,
      error: 'Failed to send invitation email'
    }
  }
}