/**
 * Tłumaczenie błędów Supabase Auth na język polski
 */
export function translateAuthError(error: any): string {
  const message = error?.message || error?.toString() || '';

  // Najpopularniejsze błędy Supabase Auth
  const errorTranslations: Record<string, string> = {
    // Login errors
    'Invalid login credentials': 'Nieprawidłowe dane logowania',
    'Email not confirmed': 'Email nie został potwierdzony',
    'Too many requests': 'Zbyt wiele prób logowania. Spróbuj ponownie później',
    'Invalid email': 'Nieprawidłowy adres email',
    'Password should be at least 6 characters': 'Hasło powinno mieć co najmniej 6 znaków',

    // Registration errors
    'User already registered': 'Użytkownik o tym adresie email już istnieje',
    'Signup not allowed': 'Rejestracja jest tymczasowo niedostępna',
    'Email address not confirmed': 'Adres email nie został potwierdzony',

    // Password reset errors
    'Unable to validate email address': 'Nie można zweryfikować adresu email',
    'User not found': 'Nie znaleziono użytkownika o tym adresie email',
    'Email rate limit exceeded': 'Przekroczono limit wysyłanych emaili. Spróbuj później',

    // Password update errors (422)
    'New password should be different from the old password': 'Nowe hasło musi być inne od poprzedniego hasła',
    'New password should be different from the old password.': 'Nowe hasło musi być inne od poprzedniego hasła',
    'Password is too weak': 'Hasło jest zbyt słabe. Użyj co najmniej 6 znaków, najlepiej zawierających litery i cyfry',
    'Same password': 'Nowe hasło musi być inne od poprzedniego hasła',
    'same_password': 'Nowe hasło musi być inne od poprzedniego hasła',
    'Password should be different from the old password': 'Nowe hasło musi być inne od poprzedniego hasła',
    'Password must be different from old password': 'Nowe hasło musi być inne od poprzedniego hasła',
    'Password does not meet requirements': 'Hasło nie spełnia wymagań bezpieczeństwa. Upewnij się, że hasło ma co najmniej 6 znaków i jest inne od poprzedniego',

    // Network errors
    'Failed to fetch': 'Błąd połączenia z serwerem. Sprawdź połączenie internetowe',
    'Network request failed': 'Błąd sieci. Sprawdź połączenie internetowe',
    'Request timeout': 'Przekroczono limit czasu żądania',

    // Generic errors
    'An error occurred': 'Wystąpił błąd. Spróbuj ponownie',
    'Internal server error': 'Błąd wewnętrzny serwera. Spróbuj ponownie później',
    'Service temporarily unavailable': 'Serwis tymczasowo niedostępny'
  };

  // Sprawdź dokładne dopasowanie
  if (errorTranslations[message]) {
    return errorTranslations[message];
  }

  // Sprawdź częściowe dopasowania
  for (const [englishError, polishError] of Object.entries(errorTranslations)) {
    if (message.toLowerCase().includes(englishError.toLowerCase())) {
      return polishError;
    }
  }

  // Dodatkowe sprawdzenia dla typowych błędów
  if (message.includes('invalid_credentials') || message.includes('Invalid credentials')) {
    return 'Nieprawidłowe dane logowania';
  }

  if (message.includes('email') && message.includes('not') && message.includes('confirmed')) {
    return 'Email nie został potwierdzony';
  }

  if (message.includes('weak') && message.includes('password')) {
    return 'Hasło jest zbyt słabe. Użyj co najmniej 6 znaków, najlepiej zawierających litery i cyfry';
  }

  if (message.includes('different') && message.includes('password')) {
    return 'Nowe hasło musi być inne od poprzedniego hasła';
  }

  if (message.includes('same') && message.includes('password')) {
    return 'Nowe hasło musi być inne od poprzedniego hasła';
  }

  if (message.includes('already') && (message.includes('registered') || message.includes('exists'))) {
    return 'Użytkownik o tym adresie email już istnieje';
  }

  if (message.includes('rate') && message.includes('limit')) {
    return 'Zbyt wiele prób. Spróbuj ponownie później';
  }

  // Jeśli nie znaleziono tłumaczenia, zwróć oryginalny błąd z polskim prefixem
  return `Błąd: ${message}`;
}

/**
 * Wrapper function dla przypadków gdy error może być string lub object
 */
export function getPolishErrorMessage(error: any): string {
  if (!error) return 'Wystąpił nieznany błąd';

  return translateAuthError(error);
}