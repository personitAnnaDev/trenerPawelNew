import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star, Users, Award, ArrowRight, Phone, Mail, MapPin } from "lucide-react";

const Index = () => {
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Executive",
      content: "Working with this coach transformed my leadership style and helped me achieve goals I never thought possible.",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Entrepreneur",
      content: "The accountability and guidance I received was exactly what I needed to break through my limiting beliefs.",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      role: "Professional",
      content: "I finally found clarity in my career path and gained the confidence to pursue my dreams.",
      rating: 5
    }
  ];

  const services = [
    {
      title: "One-on-One Coaching",
      description: "Personalized coaching sessions tailored to your unique goals and challenges.",
      features: ["60-minute sessions", "Custom action plans", "Unlimited email support", "Progress tracking"]
    },
    {
      title: "Group Coaching",
      description: "Join a supportive community of like-minded individuals on their growth journey.",
      features: ["Weekly group calls", "Peer accountability", "Shared resources", "Community support"]
    },
    {
      title: "Intensive Programs",
      description: "Deep-dive programs for rapid transformation and breakthrough results.",
      features: ["3-month commitment", "Daily check-ins", "Workbooks & materials", "Guaranteed results"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="font-bold text-2xl text-gray-900">CoachPro</div>
            <div className="hidden md:flex space-x-8">
              <a href="#about" className="text-gray-700 hover:text-blue-600 transition-colors">About</a>
              <a href="#services" className="text-gray-700 hover:text-blue-600 transition-colors">Services</a>
              <a href="#testimonials" className="text-gray-700 hover:text-blue-600 transition-colors">Testimonials</a>
              <a href="#contact" className="text-gray-700 hover:text-blue-600 transition-colors">Contact</a>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Book Free Call
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Transform Your Life with 
                  <span className="text-blue-600 block">Expert Coaching</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Unlock your potential, overcome limiting beliefs, and achieve the success you deserve. 
                  Join hundreds of clients who've transformed their lives through proven coaching methods.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6">
                  Start Your Journey <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                  Watch Success Stories
                </Button>
              </div>

              <div className="flex items-center space-x-8 pt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">500+</div>
                  <div className="text-gray-600">Clients Coached</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">10+</div>
                  <div className="text-gray-600">Years Experience</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">95%</div>
                  <div className="text-gray-600">Success Rate</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-blue-400 to-indigo-600 p-8 shadow-2xl">
                <img 
                  src="/placeholder.svg" 
                  alt="Professional Coach" 
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-current" />
                    ))}
                  </div>
                  <span className="font-semibold">4.9/5 Rating</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-4xl font-bold text-gray-900">
                  Meet Your Success Partner
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  With over a decade of experience in personal development and business coaching, 
                  I've helped hundreds of individuals break through barriers and achieve extraordinary results.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <Award className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Certified Professional Coach</h3>
                    <p className="text-gray-600">ICF Certified with advanced training in multiple methodologies</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <Users className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Proven Track Record</h3>
                    <p className="text-gray-600">500+ successful coaching relationships across various industries</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <Star className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Results-Driven Approach</h3>
                    <p className="text-gray-600">Focus on measurable outcomes and sustainable transformation</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-[4/5] rounded-3xl bg-gradient-to-br from-indigo-100 to-blue-100 p-8">
                <img 
                  src="/placeholder.svg" 
                  alt="Coach in action" 
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-bold text-gray-900">Coaching Services</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose the coaching format that best fits your needs and commitment level
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-2xl">{service.title}</CardTitle>
                  <CardDescription className="text-base">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center space-x-2">
                        <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Learn More
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-bold text-gray-900">Success Stories</h2>
            <p className="text-xl text-gray-600">
              See what our clients have achieved through coaching
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex text-yellow-400">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-current" />
                      ))}
                    </div>
                    <p className="text-gray-700 italic">"{testimonial.content}"</p>
                    <div className="pt-4 border-t">
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-gray-600">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl font-bold text-white">
                  Ready to Transform Your Life?
                </h2>
                <p className="text-xl text-blue-100">
                  Take the first step towards achieving your goals. 
                  Book a free discovery call to explore how coaching can help you.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center space-x-4 text-white">
                  <Phone className="h-6 w-6 text-blue-200" />
                  <span className="text-lg">+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center space-x-4 text-white">
                  <Mail className="h-6 w-6 text-blue-200" />
                  <span className="text-lg">hello@coachpro.com</span>
                </div>
                <div className="flex items-center space-x-4 text-white">
                  <MapPin className="h-6 w-6 text-blue-200" />
                  <span className="text-lg">New York, NY</span>
                </div>
              </div>
            </div>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-2xl">Get Started Today</CardTitle>
                <CardDescription className="text-blue-100">
                  Fill out the form below and I'll get back to you within 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    placeholder="First Name" 
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/70"
                  />
                  <Input 
                    placeholder="Last Name" 
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/70"
                  />
                </div>
                <Input 
                  placeholder="Email Address" 
                  type="email"
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/70"
                />
                <Textarea 
                  placeholder="Tell me about your goals and challenges..."
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/70 min-h-[120px]"
                />
                <Button className="w-full bg-white text-blue-600 hover:bg-gray-100 text-lg py-6">
                  Send Message
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="font-bold text-2xl mb-4">CoachPro</div>
            <p className="text-gray-400">
              © 2024 CoachPro. All rights reserved. Transform your life, one step at a time.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
