package uz.shinamagazin.api.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UserServicePasswordTest {

    private final UserService userService = new UserService(null, null, null, null, null);

    @Test
    void generatedTemporaryPasswordMatchesPasswordPolicy() {
        for (int i = 0; i < 100; i++) {
            String password = userService.generateTemporaryPassword();

            assertTrue(password.length() >= 16);
            assertTrue(password.chars().anyMatch(Character::isUpperCase));
            assertTrue(password.chars().anyMatch(Character::isLowerCase));
            assertTrue(password.chars().anyMatch(Character::isDigit));
            assertTrue(password.chars()
                    .anyMatch(ch -> !Character.isLetterOrDigit(ch) && !Character.isWhitespace(ch)));
            assertFalse(password.chars().anyMatch(Character::isWhitespace));
        }
    }
}
