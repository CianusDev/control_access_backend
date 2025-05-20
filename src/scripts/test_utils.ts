import { createUserToken, verifyUserToken } from "../utils/utils";

const token = createUserToken("test", process.env.JWT_SECRET!);
console.log({ token });

const decoded = verifyUserToken(token,process.env.JWT_SECRET!)
console.log({ decoded });

    