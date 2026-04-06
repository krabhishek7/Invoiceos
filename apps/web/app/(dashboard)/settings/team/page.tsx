"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";

export default function TeamPage() {
  const utils = trpc.useUtils();
  const { data: members, isLoading } = trpc.team.listMembers.useQuery();
  const { data: invitations } = trpc.team.listInvitations.useQuery();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ACCOUNTANT" | "STAFF">("STAFF");

  const invite = trpc.team.invite.useMutation({
    onSuccess: () => {
      toast.success("Invitation sent");
      setInviteOpen(false);
      setInviteEmail("");
      utils.team.listInvitations.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMember = trpc.team.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed");
      utils.team.listMembers.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const revokeInvitation = trpc.team.revokeInvitation.useMutation({
    onSuccess: () => {
      toast.success("Invitation revoked");
      utils.team.listInvitations.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const roleVariant: Record<string, "default" | "secondary" | "outline"> = {
    OWNER: "default",
    ACCOUNTANT: "secondary",
    STAFF: "outline",
    CA: "default",
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground text-sm">
            Manage your team members and invitations
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/settings">
            <Button variant="ghost">Back to Settings</Button>
          </Link>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger>
              <Button>Invite Member</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  invite.mutate({ email: inviteEmail, role: inviteRole });
                }}
                className="space-y-4"
              >
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    placeholder="team@example.com"
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) =>
                      setInviteRole(v as "ACCOUNTANT" | "STAFF")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STAFF">Staff</SelectItem>
                      <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={invite.isPending}>
                  {invite.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members ({members?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members?.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.name ?? "—"}
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge variant={roleVariant[member.role] ?? "outline"}>
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(member.createdAt).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell>
                      {member.role !== "OWNER" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`Remove ${member.name ?? member.email}?`)) {
                              removeMember.mutate({ userId: member.id });
                            }
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {invitations && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{inv.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          inv.status === "PENDING"
                            ? "secondary"
                            : inv.status === "ACCEPTED"
                              ? "default"
                              : "destructive"
                        }
                      >
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{inv.inviterName}</TableCell>
                    <TableCell>
                      {new Date(inv.expiresAt).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell>
                      {inv.status === "PENDING" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() =>
                            revokeInvitation.mutate({
                              invitationId: inv.id,
                            })
                          }
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
