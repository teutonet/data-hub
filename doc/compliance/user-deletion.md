# User Inactivity deletion process

- After 1 year of inactivity (not logging in):
  - send email to warn about upcoming account deletion, unless action (login) is taken
  - when the user logs back in, the account is not deleted and the warning email is sent again after 1 year of inactivity
- After additional 21 days have passed without activity:
  - send reminder email about upcoming account deletion, unless action (login) is taken
  - when the user logs back in, the account is not deleted and the warning email is sent again 21 days after the first warning email
- After additional 7 days have passed without activity:
  - send email to user that their account is deleted
  - the user account is deleted
