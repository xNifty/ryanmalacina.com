import express from "express";
import crypto from "crypto";
import auth from "../utils/auth.js";
import { strings } from "../config/constants.js";
import { Invite } from "../models/invite.js";
import logErrorToFile from "../utils/errorLogging.js";
import deleteModal from "../utils/delete-modal.js";

const ROUTER = express.Router();

// Generate a random invite code
function generateInviteCode() {
  return crypto.randomBytes(32).toString("hex");
}

// GET /createinvite - Display invite management page
ROUTER.get(
  "/",
  [auth.ValidateLoggedIn(), auth.ValidatePermission("createinvites")],
  async (req, res) => {
    try {
      const invites = await Invite.find()
        .sort({ createdAt: -1 })
        .lean();
      
      invites.forEach((invite) => {
        invite.csrfToken = res.locals._csrf;
      });

      res.render("admin/invites/invites", {
        layout: "admin",
        title: "Manage Invites",
        invites: invites,
        csrfToken: res.locals._csrf,
      });
    } catch (err) {
      logErrorToFile(err);
      req.flash("error", strings.errors.serverError);
      res.redirect("/");
    }
  }
);

// POST /createinvite - Create a new invite
ROUTER.post(
  "/",
  [auth.ValidateLoggedIn(), auth.ValidatePermission("createinvites")],
  async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || !email.trim()) {
        req.flash("error", "Email is required");
        res.redirect("/createinvite");
        return;
      }

      // Check if email already exists
      const existingInvite = await Invite.findOne({ 
        email: email.toLowerCase().trim() 
      });

      if (existingInvite) {
        req.flash("error", "An invite for this email already exists");
        res.redirect("/createinvite");
        return;
      }

      // Generate invite code
      const inviteCode = generateInviteCode();

      // Create new invite
      const invite = new Invite({
        email: email.toLowerCase().trim(),
        inviteCode: inviteCode,
        inviteused: 0,
      });

      await invite.save();

      req.flash("success", "Invite created successfully");
      res.redirect("/createinvite");
    } catch (err) {
      logErrorToFile(err);
      if (err.code === 11000) {
        // Duplicate key error
        req.flash("error", "An invite for this email already exists");
      } else {
        req.flash("error", "Failed to create invite");
      }
      res.redirect("/createinvite");
    }
  }
);

// POST /createinvite/:id/edit - Update an invite (only if unused)
ROUTER.post(
  "/:id/edit",
  [auth.ValidateLoggedIn(), auth.ValidatePermission("createinvites")],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { email } = req.body;

      if (!email || !email.trim()) {
        req.flash("error", "Email is required");
        res.redirect(`/createinvite/${id}/edit`);
        return;
      }

      // Find the invite
      const invite = await Invite.findById(id);
      
      if (!invite) {
        req.flash("error", "Invite not found");
        res.redirect("/createinvite");
        return;
      }

      // Only allow editing if invite is unused
      if (invite.inviteused === 1) {
        req.flash("error", "Cannot edit an invite that has already been used");
        res.redirect("/createinvite");
        return;
      }

      // Check if email already exists (excluding current invite)
      const existingInvite = await Invite.findOne({ 
        email: email.toLowerCase().trim(),
        _id: { $ne: id }
      });

      if (existingInvite) {
        req.flash("error", "An invite for this email already exists");
        res.redirect(`/createinvite/${id}/edit`);
        return;
      }

      // Update the invite
      invite.email = email.toLowerCase().trim();
      await invite.save();

      req.flash("success", "Invite updated successfully");
      res.redirect("/createinvite");
    } catch (err) {
      logErrorToFile(err);
      if (err.code === 11000) {
        req.flash("error", "An invite for this email already exists");
      } else {
        req.flash("error", "Failed to update invite");
      }
      res.redirect(`/createinvite/${id}/edit`);
    }
  }
);

// PUT /createinvite/delete/:id - Delete an invite (only if unused)
ROUTER.put(
  "/delete/:id",
  [auth.ValidateLoggedIn(), auth.ValidatePermission("createinvites")],
  async (req, res) => {
    try {
      const { id } = req.params;

      // Find the invite
      const invite = await Invite.findById(id);
      
      if (!invite) {
        req.flash("error", "Invite not found");
        res.set("HX-Location", "/createinvite");
        return res.status(404).end();
      }

      // Only allow deleting if invite is unused
      if (invite.inviteused === 1) {
        req.flash("error", "Cannot delete an invite that has already been used");
        res.set("HX-Location", "/createinvite");
        return res.status(400).end();
      }

      // Delete the invite
      await Invite.findByIdAndDelete(id);

      req.flash("success", "Invite deleted successfully");
      res.set("HX-Location", "/createinvite");
      return res.status(200).end();
    } catch (err) {
      logErrorToFile(err);
      req.flash("error", "Failed to delete invite");
      res.set("HX-Location", "/createinvite");
      return res.status(500).end();
    }
  }
);

// GET /createinvite/:id/edit - Get edit form for an invite
ROUTER.get(
  "/:id/edit",
  [auth.ValidateLoggedIn(), auth.ValidatePermission("createinvites")],
  async (req, res) => {
    try {
      const { id } = req.params;
      const invite = await Invite.findById(id).lean();

      if (!invite) {
        req.flash("error", "Invite not found");
        res.redirect("/createinvite");
        return;
      }

      if (invite.inviteused === 1) {
        req.flash("error", "Cannot edit an invite that has already been used");
        res.redirect("/createinvite");
        return;
      }

      res.render("admin/invites/edit", {
        layout: "admin",
        title: "Edit Invite",
        invite: invite,
        csrfToken: res.locals._csrf,
      });
    } catch (err) {
      logErrorToFile(err);
      req.flash("error", strings.errors.serverError);
      res.redirect("/createinvite");
    }
  }
);

// GET /createinvite/delete-modal/:id - Get delete modal
ROUTER.get(
  "/delete-modal/:id",
  [auth.ValidateLoggedIn(), auth.ValidatePermission("createinvites")],
  async (req, res) => {
    try {
      const { id } = req.params;
      const invite = await Invite.findById(id).lean();

      if (!invite) {
        return res.status(404).send("Invite not found");
      }

      if (invite.inviteused === 1) {
        return res.status(400).send("Cannot delete an invite that has already been used");
      }

      // Use the delete modal utility similar to news
      const sanitizedID = id;
      const sanitizedCSRFToken = res.locals._csrf;
      const modal = deleteModal(
        sanitizedID,
        sanitizedCSRFToken,
        "/createinvite/delete/"
      );

      res.send(modal);
    } catch (err) {
      logErrorToFile(err);
      res.status(500).send("Error loading delete modal");
    }
  }
);

export { ROUTER as invitesRoute };

