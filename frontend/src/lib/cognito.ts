/**
 * AWS Cognito client for LixyLearning.
 * Uses amazon-cognito-identity-js for authentication.
 * When NEXT_PUBLIC_USE_COGNITO is not "true", all functions no-op and return false.
 */

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from "amazon-cognito-identity-js";

const USE_COGNITO =
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_COGNITO === "true";

const poolData = () => ({
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "",
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "",
});

let userPool: CognitoUserPool | null = null;

function getUserPool(): CognitoUserPool | null {
  if (!USE_COGNITO || !poolData().UserPoolId || !poolData().ClientId) {
    return null;
  }
  if (!userPool) {
    userPool = new CognitoUserPool(poolData());
  }
  return userPool;
}

export function isCognitoEnabled(): boolean {
  return USE_COGNITO && !!getUserPool();
}

/**
 * Sign in with email and password.
 * Returns the Id Token on success, or throws with error message.
 */
export function signIn(email: string, password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool();
    if (!pool) {
      reject(new Error("Cognito is not configured"));
      return;
    }

    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: pool,
    });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (result) => {
        const idToken = result.getIdToken().getJwtToken();
        resolve(idToken);
      },
      onFailure: (err) => {
        const e = err as { code?: string; message?: string };
        const msg =
          e.code === "UserNotFoundException"
            ? "Usuario no encontrado"
            : e.code === "NotAuthorizedException"
              ? "Contraseña incorrecta"
              : e.message || "Error al iniciar sesión";
        reject(new Error(msg));
      },
    });
  });
}

export interface SignUpAttributes {
  given_name?: string;
  family_name?: string;
}

/**
 * Sign up with email and password.
 * Triggers email verification. Resolves with the CognitoUser on success.
 */
export function signUp(
  email: string,
  password: string,
  attributes: SignUpAttributes = {}
): Promise<{ user: CognitoUser; userSub: string }> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool();
    if (!pool) {
      reject(new Error("Cognito is not configured"));
      return;
    }

    const attributeList: CognitoUserAttribute[] = [
      new CognitoUserAttribute({ Name: "email", Value: email }),
    ];
    if (attributes.given_name) {
      attributeList.push(
        new CognitoUserAttribute({ Name: "given_name", Value: attributes.given_name })
      );
    }
    if (attributes.family_name) {
      attributeList.push(
        new CognitoUserAttribute({ Name: "family_name", Value: attributes.family_name })
      );
    }

    pool.signUp(email, password, attributeList, [], (err, result) => {
      if (err) {
        const e = err as { code?: string; message?: string };
        const msg =
          e.code === "UsernameExistsException"
            ? "El correo ya está registrado"
            : e.message || "Error al registrarse";
        reject(new Error(msg));
        return;
      }
      if (!result?.user) {
        reject(new Error("Error al crear usuario"));
        return;
      }
      resolve({
        user: result.user,
        userSub: result.userSub || "",
      });
    });
  });
}

/**
 * Confirm sign up with the verification code sent to email.
 */
export function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool();
    if (!pool) {
      reject(new Error("Cognito is not configured"));
      return;
    }
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: pool,
    });
    cognitoUser.confirmRegistration(code, true, (err) => {
      if (err) {
        const e = err as { code?: string; message?: string };
        const msg =
          e.code === "CodeMismatchException"
            ? "Código de verificación incorrecto"
            : e.message || "Error al verificar";
        reject(new Error(msg));
        return;
      }
      resolve();
    });
  });
}
