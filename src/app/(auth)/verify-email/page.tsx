'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/firebase/auth-provider";
import { useFirebaseAuth } from "@/firebase/provider";
import { useToast } from "@/hooks/use-toast";
import { sendEmailVerification } from "firebase/auth";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";


export default function VerifyEmailPage() {
    const { user, logout } = useAuth();
    const auth = useFirebaseAuth();
    const { toast } = useToast();
    const [isSending, setIsSending] = useState(false);

    const handleResendVerification = async () => {
        if (!user) {
            toast({
                variant: "destructive",
                title: "Not Logged In",
                description: "You need to be logged in to resend a verification email.",
            });
            return;
        }

        setIsSending(true);
        try {
            await sendEmailVerification(user);
            toast({
                title: "Email Sent",
                description: "A new verification link has been sent to your email address.",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to send verification email. Please try again later.",
            });
        } finally {
            setIsSending(false);
        }
    };


    return (
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                    <MailCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="mt-4">Verify your email to continue</CardTitle>
                <CardDescription>
                    We&apos;ve sent a verification link to <span className="font-semibold text-foreground">{user?.email}</span>.
                    Please click the link in the email to activate your account.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <Button onClick={handleResendVerification} disabled={isSending} className="w-full">
                    {isSending ? "Sending..." : "Resend Verification Email"}
                </Button>
                <Button onClick={logout} variant="outline" className="w-full">
                    Back to Login
                </Button>
            </CardContent>
        </Card>
    )
}
