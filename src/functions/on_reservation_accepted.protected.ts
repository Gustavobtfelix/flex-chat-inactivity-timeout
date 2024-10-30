// Imports global types
import '@twilio-labs/serverless-runtime-types'
// Fetches specific types
import {
  Context,
  ServerlessCallback,
  ServerlessFunctionSignature,
} from '@twilio-labs/serverless-runtime-types/types'

// Environment variables
type Env = {
  TIMEOUT: string
}

interface Request {
    cookies: {};
    headers: {};
}


// Webhook event type with needed fields
type OnReservationAccepted = {
  request: Request;
  TaskAttributes: string,
}

export const handler: ServerlessFunctionSignature<Env, OnReservationAccepted> = async function (
  context: Context<Env>,
  event: OnReservationAccepted,
  callback: ServerlessCallback,
) {

  console.log(event)

  // Parse task attributes JSON string into object
  let taskAttributes = JSON.parse(event.TaskAttributes)

  // Get Conversation SID for task attributes
  let conversationSid = taskAttributes["conversationSid"]

  // Create a TwilioResponse object
  const response = new Twilio.Response()
  response.appendHeader('Content-Type', 'application/json')

  // Create Conversation Context object
  const conversationContext = context
    .getTwilioClient()
    .conversations
    .v1.conversations(conversationSid)

  // Create a webhook on the Conversation to be fired on onConversationStateUpdated
  // targeting on_conversation_state_updated function
  try {
    await conversationContext
      .webhooks
      .create({
        target: 'webhook',
        "configuration.url": `https://${context.DOMAIN_NAME}/on_conversation_state_updated`,
        "configuration.method": 'POST',
        "configuration.filters": ['onConversationStateUpdated']
      })
  } catch (err) {
    console.error(err)
    response.setStatusCode(500)
    return callback(response)
  }

  // Create an inactivity timeout on the Conversation using timeout from environment variable
  try {
    await conversationContext
      .update({
        "timers.inactive": context.TIMEOUT
      })
  } catch (err) {
    console.error(err)
    response.setStatusCode(500)
    return callback(response)
  }

  // Return success response
  console.log('OK')
  response.setStatusCode(200)
  response.setBody({
    ConversationSid: conversationSid,
  })
  return callback(null, response)
}