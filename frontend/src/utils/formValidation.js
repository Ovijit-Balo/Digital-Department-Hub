const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const trim = (value) => String(value || '').trim();

export function validateLoginForm(form) {
  const errors = {};

  if (!trim(form.email)) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_PATTERN.test(trim(form.email))) {
    errors.email = 'Enter a valid email address.';
  }

  if (!trim(form.password)) {
    errors.password = 'Password is required.';
  }

  return errors;
}

export function validateRegisterForm(form) {
  const errors = {};

  if (trim(form.fullName).length < 2) {
    errors.fullName = 'Full name must be at least 2 characters.';
  }

  if (!trim(form.email)) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_PATTERN.test(trim(form.email))) {
    errors.email = 'Enter a valid email address.';
  }

  if (trim(form.password).length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  if (trim(form.department) && trim(form.department).length > 120) {
    errors.department = 'Department is too long.';
  }

  return errors;
}

export function validateInquiryForm(form) {
  const errors = {};

  if (trim(form.name).length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }

  if (!trim(form.email)) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_PATTERN.test(trim(form.email))) {
    errors.email = 'Enter a valid email address.';
  }

  if (trim(form.subject).length < 3) {
    errors.subject = 'Subject must be at least 3 characters.';
  }

  if (trim(form.message).length < 10) {
    errors.message = 'Message must be at least 10 characters.';
  }

  return errors;
}

export function validateBookingForm(form) {
  const errors = {};

  if (!trim(form.venue)) {
    errors.venue = 'Venue is required.';
  }

  if (trim(form.title).length < 3) {
    errors.title = 'Title must be at least 3 characters.';
  }

  if (trim(form.purpose).length < 5) {
    errors.purpose = 'Purpose must be at least 5 characters.';
  }

  if (!trim(form.startTime)) {
    errors.startTime = 'Start time is required.';
  }

  if (!trim(form.endTime)) {
    errors.endTime = 'End time is required.';
  }

  const attendeeCount = Number(form.attendeeCount);
  if (!Number.isFinite(attendeeCount) || attendeeCount < 1) {
    errors.attendeeCount = 'Attendee count must be at least 1.';
  }

  if (trim(form.bookingType) === 'class' && !trim(form.classCode)) {
    errors.classCode = 'Class code is required for class bookings.';
  }

  return errors;
}
