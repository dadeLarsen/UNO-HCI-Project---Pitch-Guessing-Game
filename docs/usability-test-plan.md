# Pitch Guesser Usability Test Plan

## Purpose

This formative usability test will evaluate whether a first-time user can
understand and use the Pitch Guesser prototype's voice-based practice loop.
The test will focus on discoverability, clarity of feedback, speech-recognition
behavior, and the user's understanding of what to do next.

The test uses one participant. This is an early test of a prototype, so the
goal is to identify important usability problems rather than to measure
statistically representative performance.

## Usage scenarios and test context

The test is based on the usage scenarios from Status Report 3:

1. **Solo pitcher practice:** A pitcher is practicing alone, starts a round,
   studies the displayed pitch, and says a guess. Immediate feedback tells the
   pitcher whether the guess was correct, and a correct answer begins the next
   challenge without typing or navigation.
2. **Coach-led demonstration:** A coach projects the application for a group.
   A player names a pitch aloud while others see the transcript, interpreted
   pitch, and result. The coach may discuss examples such as a speech
   recognition error being interpreted as “fastball.”
3. **Natural speech and microphone problems:** A user speaks naturally, such as
   saying “that was a fast ball,” or encounters a browser, permission, or
   microphone problem. The prototype should make the result or problem
   understandable.

For this test, the participant will take the role of a player practicing with
the app. The facilitator will explain that Pitch Guesser is a browser-based
baseball pitch-recognition practice game. The participant should assume that
the displayed pitch image represents the pitch they are trying to identify.
The participant will not receive a step-by-step user manual.

## Participant tasks

The facilitator will give the participant these tasks one at a time. The
facilitator should read only the task context and goal, then allow the
participant to decide what to do.

### Task 1: Start a practice round

You are a pitcher practicing alone before a game. Use Pitch Guesser to begin
a practice round and get ready to identify the pitch shown by the app.

**Observe:** Whether the participant can identify how to begin, understands
the microphone state, and knows when the round is ready.

### Task 2: Make a natural pitch guess

The app is showing you a pitch. Say the name of the pitch you think it is,
using your normal speaking style. Continue until you receive a clear result.

**Observe:** Whether the participant understands that the guess is spoken,
whether they study the displayed pitch before answering, and whether the
transcript and result make sense to them.

### Task 3: Recover from an incorrect guess

Your first guess was not correct. Keep working with the same challenge until
you understand what the app expects and can make another guess.

**Observe:** Whether the red incorrect feedback is understandable, whether
the participant knows they can try again, and whether they become confused
about how to continue.

### Task 4: Continue after a correct guess

You correctly identified the pitch. Continue practicing by completing the next
challenge that the app presents.

**Observe:** Whether the participant notices that a new challenge has started,
understands the green correct feedback, and can repeat the game loop without
facilitator help.

### Task 5: Use natural phrasing

Imagine you are talking with a coach and say, “that was a fast ball,” rather
than using only the exact pitch name. Make a guess in the way that feels
natural to you.

**Observe:** Whether the participant trusts the interpretation, understands
how the app handled the phrase, and notices any difference between the raw
transcript and the interpreted pitch.

### Task 6: Stop practicing

You are finished with this practice session. Leave the app in a state that
shows you are no longer using the microphone.

**Observe:** Whether the participant can stop the interaction, recognizes the
microphone-off state, and understands what happened to the displayed feedback
and transcript.

If the prototype cannot provide a reliable microphone or speech-recognition
response during the session, the Computer will simulate the expected response
and record that limitation. The facilitator may then ask the participant to
describe what they would expect after a denied permission or unavailable
microphone, without turning the test into a technical troubleshooting exercise.

## Test location and setup

The test will take place in a quiet room on campus, such as a study room or
team workspace. A face-to-face session is preferred so the observer can see
where the participant looks and note reactions. If an in-person session is not
possible, the same test may be conducted over Zoom with screen sharing.

Before the participant arrives, the team will:

- Open the prototype in a supported Chromium browser over localhost or HTTPS.
- Confirm that the microphone and speech recognition are available for the Computer role.
- Display the prototype at a readable size.
- Prepare the task prompts and an observation sheet.
- Confirm that no personal information is needed for the test.

The session should take approximately 15–20 minutes: a brief introduction,
the tasks, and a short debrief.

## Recruiting strategy

We will recruit one person who is willing to try a short prototype test. The
first choice is a sibling, friend, classmate, or teammate who is interested in
baseball or familiar with saying baseball pitch names. Baseball expertise is
not required; a participant who is less familiar with the terminology can
reveal whether the interface explains itself.

A team member will invite the person directly, explain that the test evaluates
the prototype rather than the participant, and schedule a 15–20 minute
session. The participant may stop at any time. We will not collect names,
contact details, or other identifying information in the observation notes.
If no outside participant is available, one teammate will serve as the
participant and this limitation will be noted when interpreting the results.

## Roles

The team will assign these roles before the session:

- **Facilitator:** Welcomes the participant, explains the scenario, reads each
  task, answers only clarification questions, and avoids leading the
  participant toward a particular control. The facilitator is the primary
  person the participant talks to.
- **Observer:** Watches without interrupting, records task completion,
  unexpected actions, hesitation, questions, errors, comments, and visible
  reactions. The observer also records when the facilitator provides help.
- **Computer:** Provides or simulates the prototype's responses
  when the browser cannot reliably produce them. This role may select the
  displayed pitch, provide a transcript, and show correct or incorrect
  feedback according to the test script. The Computer should not coach the
  participant or reveal the intended answer.

For a small team, the Facilitator and Observer may be the same person. The
Computer should remain separate whenever possible so that the participant's
interaction stays natural. If only one tester is available, that person may
combine all three roles and should clearly mark simulated responses in the
notes.

## Observation and success criteria

For each task, the Observer will record:

- Whether the participant completed the task without help, with a prompt, or
  not at all.
- The participant's first action and any hesitation or wrong turn.
- Questions, comments, confusion, frustration, or signs of confidence.
- Whether the participant understood the microphone state, transcript,
  interpreted pitch, and correct/incorrect feedback.
- Any discrepancy between the participant's expectation and the prototype's
  response.

The test will be considered encouraging if the participant can start the
round, make a spoken guess, understand both incorrect and correct feedback,
continue to the next challenge, and stop the microphone without detailed
instructions. The team will prioritize issues where the participant is unable
to continue, misunderstands whether a guess was accepted, or cannot tell
whether the microphone is active.

## Debrief questions

After the tasks, the Facilitator will ask:

1. What did you think the app was asking you to do?
2. What, if anything, was confusing about starting or stopping?
3. How did you interpret the transcript and the correct/incorrect feedback?
4. Did the app respond as you expected when you spoke naturally?
5. What would make this practice activity easier or more useful?

The team will summarize findings by task, separate observed behavior from
participant opinions, and identify the highest-priority changes for the next
prototype iteration.
