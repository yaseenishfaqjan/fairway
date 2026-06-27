import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Seo } from "@/components/seo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { useCreateDemoRequest } from "@workspace/api-client-react";

const demoSchema = z.object({
  clubName: z.string().min(2, "Club name is required"),
  contactName: z.string().min(2, "Contact name is required"),
  phoneNumber: z.string().min(10, "Valid phone number is required"),
  email: z.string().email("Valid email is required"),
  businessType: z.string().min(1, "Please select a business type"),
  problem: z.string().min(1, "Please select your biggest problem"),
  volume: z.string().min(1, "Please select your lead volume"),
});

export function Demo() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const createDemoRequest = useCreateDemoRequest();

  const form = useForm<z.infer<typeof demoSchema>>({
    resolver: zodResolver(demoSchema),
    defaultValues: {
      clubName: "",
      contactName: "",
      phoneNumber: "",
      email: "",
      businessType: "",
      problem: "",
      volume: "",
    },
  });

  async function onSubmit(values: z.infer<typeof demoSchema>) {
    try {
      await createDemoRequest.mutateAsync({
        data: {
          name: values.contactName,
          clubName: values.clubName,
          email: values.email,
          phone: values.phoneNumber,
          businessType: values.businessType,
          problem: values.problem,
          volume: values.volume,
        },
      });
      setSubmitted(true);
    } catch {
      toast({
        title: "Something went wrong",
        description:
          "We couldn't submit your request. Please try again, or email us directly.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title="Book a Demo — See Fairway360 in Action | Fairway360"
        description="Get a personalized walkthrough of Fairway360 and see exactly how it recovers lost revenue for your golf course or country club. Book your demo today."
        path="/demo"
      />
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-16 md:px-6 md:py-24 max-w-3xl">
        <div className="text-center mb-12">
          <p className="eyebrow text-[hsl(38_55%_40%)] mb-5">Book a Demo</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-4">Request Your Automation Demo</h1>
          <p className="text-xl text-muted-foreground">
            Get a personalized walkthrough of Fairway360 and see exactly how it can recover lost revenue for your club.
          </p>
        </div>

        {submitted ? (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-primary" />
              <CardTitle className="text-2xl">Demo Requested!</CardTitle>
              <CardDescription className="text-lg">
                Our team will reach out within 1 business day to schedule your personalized Fairway360 walkthrough.
              </CardDescription>
              <Button className="mt-4" onClick={() => setSubmitted(false)}>Submit Another Request</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Tell us about your operation</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="clubName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Club Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Augusta National" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="john@club.com" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="businessType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type of Business</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="public">Public Golf Course</SelectItem>
                            <SelectItem value="semi-private">Semi-Private Club</SelectItem>
                            <SelectItem value="private">Private Country Club</SelectItem>
                            <SelectItem value="range">Driving Range</SelectItem>
                            <SelectItem value="academy">Golf Academy</SelectItem>
                            <SelectItem value="resort">Resort/Hotel Golf</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="problem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Biggest Problem to Solve</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select problem" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="missed-calls">Missed Calls</SelectItem>
                            <SelectItem value="slow-followup">Slow Lead Follow-Up</SelectItem>
                            <SelectItem value="events">Event Lead Management</SelectItem>
                            <SelectItem value="membership">Membership Conversion</SelectItem>
                            <SelectItem value="staff">Staff Overwhelm</SelectItem>
                            <SelectItem value="reviews">Review Generation</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="volume"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Lead Volume (Inquiries)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select volume" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="lt-50">Less than 50</SelectItem>
                            <SelectItem value="50-150">50–150</SelectItem>
                            <SelectItem value="150-300">150–300</SelectItem>
                            <SelectItem value="300+">300+</SelectItem>
                            <SelectItem value="unsure">Not Sure</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" size="lg" disabled={createDemoRequest.isPending}>
                    {createDemoRequest.isPending ? "Submitting…" : "Request Automation Demo"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
