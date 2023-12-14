import multer, { memoryStorage } from "multer";

const memStorage = memoryStorage()

export default multer({storage: memStorage})