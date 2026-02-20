import mongoose, { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },
    image: { type: String },
    provider: { type: String },
    providerId: { type: String },
  },
  { timestamps: true }
);

const User = (models.User as mongoose.Model<any>) || model("User", UserSchema);
export default User;
